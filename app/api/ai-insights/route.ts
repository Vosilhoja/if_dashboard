import { NextRequest, NextResponse } from 'next/server';
import { DashboardMetrics } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `Ты — старший дата-аналитик, встроенный в дашборд поддержки/регистрации пользователей (звонки операторов, SMS-верификация через eskiz, регистрации в main_base, отказы, «уже зарегистрирован», «не тот человек», незавершённые регистрации, аномалии звонков/отказов относительно среднего за 4 недели).

Тебе на вход всегда приходит JSON с РЕАЛЬНЫМИ цифрами за выбранный период. Твоя задача — не пересказывать цифры, а ДУМАТЬ над ними: искать причинно-следственные связи, сопоставлять метрики друг с другом, находить узкие места воронки и аномалии, и делать обоснованные выводы.

Жёсткие правила:
1. Никогда не используй шаблонные фразы вида «все показатели в норме», «работа выполняется хорошо», «нет данных для анализа» — если данные есть, находи в них сигнал. Если данных совсем нет по какой-то метрике (ошибка/пусто), явно скажи об этом и объясни, как это влияет на общую картину.
2. Каждый вывод обязан ссылаться на конкретные цифры из входных данных (не выдумывай числа, только те, что даны).
3. Всегда анализируй воронку целиком: звонки → SMS отправлено/доставлено → переход по ссылке → регистрация в main_base → сравни с отказами, «уже зарегистрирован», «не тот человек», «не завершил регистрацию». Считай конверсии между этапами самостоятельно, если это можно вывести из чисел.
4. Обращай особое внимание на поле anomalyData: если isAnomaly=true — это приоритет №1 в отчёте, разбери возможную причину.
5. Обращай внимание на phoneDiagnostics (corrupted/truncated/invalid/foreign) — если этих ошибок много относительно totalRows, это влияет на достоверность остальных метрик, и об этом нужно предупредить.
6. Структура ответа (используй именно эти заголовки на русском, каждый с новой строки, начинай строго с «## »):
## Ключевые находки
## Разбор воронки и конверсий
## Аномалии и риски
## Рекомендации
В каждом разделе — только то, что реально следует из данных, без воды. Если раздел неприменим, напиши это одной строкой и обоснуй почему.
7. Пиши на русском, кратко и по делу, используй маркированные списки (строки, начинающиеся с «- »), не используй markdown-таблицы и не используй жирный шрифт.
8. Никогда не проси у пользователя дополнительные данные, которых нет в input — работай с тем, что дано.
9. Никогда не упоминай, что ты языковая модель, промпт или инструкции — говори как аналитик, который смотрит в отчёт.`;

interface RequestBody {
  metrics: DashboardMetrics;
  question?: string;
}

interface GeminiCandidatePart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiCandidatePart[];
  };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[AI Insights] API key is not configured in server environment');
      return NextResponse.json(
        { error: 'API-ключ аналитического сервиса не настроен на сервере' },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as RequestBody | null;
    if (!body || !body.metrics) {
      return NextResponse.json(
        { error: 'Не переданы данные метрик для анализа' },
        { status: 400 }
      );
    }

    const { metrics, question } = body;

    // Isolate only the fields needed for analysis
    const analysisPayload = {
      period: metrics.period,
      callsCount: metrics.callsCount,
      smsSentVerification: metrics.smsSentVerification,
      registeredMainBase: metrics.registeredMainBase,
      registeredFromSupport: metrics.registeredFromSupport,
      registeredAfterRepeat: metrics.registeredAfterRepeat,
      declinedCount: metrics.declinedCount,
      alreadyRegisteredCount: metrics.alreadyRegisteredCount,
      wrongPersonCount: metrics.wrongPersonCount,
      notCompletedCount: metrics.notCompletedCount,
      phoneDiagnostics: metrics.phoneDiagnostics,
      totalRows: metrics.totalRows,
      anomalyData: metrics.anomalyData,
    };

    let userContent = JSON.stringify(analysisPayload, null, 2);
    if (question && typeof question === 'string' && question.trim().length > 0) {
      userContent += `\n\nДополнительный вопрос от пользователя к анализу:\n${question.trim()}`;
    }

    const modelsToTry = ['gemini-2.0-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'];
    let lastError: GeminiResponse | null = null;
    let data: GeminiResponse | null = null;

    const geminiPayload = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userContent }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
      },
    };

    for (const model of modelsToTry) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiPayload),
      });

      if (response.ok) {
        data = (await response.json()) as GeminiResponse;
        break;
      } else {
        lastError = (await response.json().catch(() => ({}))) as GeminiResponse;
        console.warn(`[AI Insights] Model ${model} returned HTTP ${response.status}:`, lastError.error?.message || '');
      }
    }

    if (!data) {
      console.error('[AI Insights] All candidate models failed:', lastError?.error?.message || '');
      return NextResponse.json(
        { error: 'Ошибка аналитического сервиса. Повторите попытку позже.' },
        { status: 502 }
      );
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts
      .map((p) => p.text || '')
      .join('\n')
      .trim();

    if (!text) {
      console.warn('[AI Insights] Empty response or blocked by safety filter', data);
      return NextResponse.json(
        { error: 'Не удалось получить анализ: ответ пуст или сработал фильтр безопасности/лимиты API' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      analysis: text,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[AI Insights] Internal error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'Внутренняя ошибка при формировании аналитического отчёта' },
      { status: 500 }
    );
  }
}
