import { NextRequest, NextResponse } from 'next/server';
import { DashboardMetrics } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  metrics?: DashboardMetrics | null;
  selectedRegion?: string | null;
  period?: { startDate?: string; endDate?: string } | null;
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
      console.error('[AI Chat] GEMINI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'API-ключ Gemini не настроен на сервере' },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as RequestBody | null;
    if (!body || !body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'История сообщений пуста' },
        { status: 400 }
      );
    }

    const { messages, metrics, selectedRegion, period } = body;

    // Prepare ground-truth operational context for the AI
    let contextSummary = 'Данные за текущий период не переданы или ещё загружаются.';

    if (metrics) {
      const calls = typeof metrics.callsCount?.value === 'number' ? metrics.callsCount.value : 0;
      const sms = typeof metrics.smsSentVerification?.value === 'number' ? metrics.smsSentVerification.value : 0;
      const reg = typeof metrics.registeredMainBase?.value === 'number' ? metrics.registeredMainBase.value : 0;
      const support = typeof metrics.registeredFromSupport?.value === 'number' ? metrics.registeredFromSupport.value : 0;
      const repeat = typeof metrics.registeredAfterRepeat?.value === 'number' ? metrics.registeredAfterRepeat.value : 0;
      const declined = typeof metrics.declinedCount?.value === 'number' ? metrics.declinedCount.value : 0;
      const alreadyReg = typeof metrics.alreadyRegisteredCount?.value === 'number' ? metrics.alreadyRegisteredCount.value : 0;
      const wrongPerson = typeof metrics.wrongPersonCount?.value === 'number' ? metrics.wrongPersonCount.value : 0;
      const notCompleted = typeof metrics.notCompletedCount?.value === 'number' ? metrics.notCompletedCount.value : 0;

      const callToSmsConv = calls > 0 ? ((sms / calls) * 100).toFixed(1) : '0';
      const smsToRegConv = sms > 0 ? ((reg / sms) * 100).toFixed(1) : '0';
      const endToEndConv = calls > 0 ? ((reg / calls) * 100).toFixed(1) : '0';

      contextSummary = `
АКТУАЛЬНЫЕ МЕТРИКИ ДАШБОРДА HURMO UZ:
- Выбранный период: с ${metrics.period?.startDate || period?.startDate || 'н/д'} по ${metrics.period?.endDate || period?.endDate || 'н/д'}
${selectedRegion ? `- Активный географический фильтр: регион "${selectedRegion}"` : '- География: вся территория Узбекистана (14 областей)'}

ВОРОНКА ОПЕРАЦИЙ:
1. Входящие/исходящие звонки операторов: ${calls.toLocaleString('ru-RU')}
2. Отправлено SMS со ссылкой верификации (Eskiz): ${sms.toLocaleString('ru-RU')} (конверсия из звонка: ${callToSmsConv}%)
3. Успешно завершённых регистраций в main_base: ${reg.toLocaleString('ru-RU')} (конверсия из SMS: ${smsToRegConv}%, сквозная: ${endToEndConv}%)
   - Из них зарегистрировано операторами поддержки: ${support.toLocaleString('ru-RU')}
   - Из них завершено после повторных обращений: ${repeat.toLocaleString('ru-RU')}

ПОТЕРИ И ОТСЕВ:
- Отказы респондентов: ${declined.toLocaleString('ru-RU')} (${calls > 0 ? ((declined / calls) * 100).toFixed(1) : '0'}% от звонков)
- Уже зарегистрированы в боте ранее: ${alreadyReg.toLocaleString('ru-RU')}
- Не тот человек / чужой номер: ${wrongPerson.toLocaleString('ru-RU')}
- Не завершили регистрацию (бросили на полпути): ${notCompleted.toLocaleString('ru-RU')}

ДИАГНОСТИКА НОМЕРОВ:
- Повреждённые номера: ${metrics.phoneDiagnostics?.corrupted ?? 0}
- Усечённые номера: ${metrics.phoneDiagnostics?.truncated ?? 0}
- Невалидные номера: ${metrics.phoneDiagnostics?.invalid ?? 0}
- Зарубежные номера: ${metrics.phoneDiagnostics?.foreign ?? 0}

АНОМАЛИИ ЗА 4 НЕДЕЛИ:
- Звонки: текущие ${metrics.anomalyData?.callsAnomaly?.current ?? calls}, среднее за 4 недели ${metrics.anomalyData?.callsAnomaly?.baseline4WeeksAvg ?? 'н/д'}, отклонение ${metrics.anomalyData?.callsAnomaly?.deltaPercent ?? 0}%, статус аномалии: ${metrics.anomalyData?.callsAnomaly?.isAnomaly ? 'АНОМАЛИЯ' : 'Норма'}
- Отказы: текущие ${metrics.anomalyData?.declinedAnomaly?.current ?? declined}, среднее за 4 недели ${metrics.anomalyData?.declinedAnomaly?.baseline4WeeksAvg ?? 'н/д'}, отклонение ${metrics.anomalyData?.declinedAnomaly?.deltaPercent ?? 0}%, статус аномалии: ${metrics.anomalyData?.declinedAnomaly?.isAnomaly ? 'КРИТИЧЕСКАЯ АНОМАЛИЯ' : 'Норма'}

ОБЩИЙ ОБЪЁМ ТАБЛИЦ GOOGLE SHEETS:
- main_base (пользователи): ${metrics.totalRows?.main ?? reg}
- numbers (обзвоны): ${metrics.totalRows?.numbers ?? calls}
- eskiz (SMS): ${metrics.totalRows?.eskiz ?? sms}
- not_completed: ${metrics.totalRows?.not_completed ?? notCompleted}
`;
    }

    const SYSTEM_PROMPT = `Ты — старший дата-аналитик и стратегический консультант по операционной воронке платформы HURMO UZ (Узбекистан).
Ты встроен прямо в интерактивный чат дашборда и помогаешь руководителю проекта, маркетологам и старшим операторам принимать решения.

ТЕБЕ ДОСТУПЕН ПОЛНЫЙ КОНТЕКСТ ДАННЫХ ДАШБОРДА:
${contextSummary}

ТВОИ ПРАВИЛА РАБОТЫ В ДИАЛОГЕ:
1. Опирайся на РЕАЛЬНЫЕ цифры из контекста выше. Всегда называй точные числа звонков, конверсий, отказов и аномалий, когда отвечаешь на вопросы.
2. Не будь сухим справочником: давай экспертную интерпретацию («почему это произошло?», «чем это грозит?», «какой конкретный шаг сделать прямо сейчас?»).
3. Давай практические, применимые советы для колл-центра и продуктовой воронки:
   - Как скорректировать скрипты операторов при росте отказов.
   - Как настроить SMS-триггеры через Eskiz (напоминания тем 21 пользователям, кто не завершил регистрацию).
   - Как валидировать телефонные номера до звонка, исключая невалидные и зарубежные.
   - Как фильтровать звонки к уже зарегистрированным клиентам.
4. Отвечай дружелюбно, профессионально, структурированно (используй списки, жирный шрифт для ключевых метрик, понятные шаги).
5. Если пользователь задаёт вопрос не про цифры, а про совет («как улучшить конверсию?», «что делать с операторами?»), связывай рекомендации с текущими узкими местами воронки.
6. Пиши на русском языке. Никогда не говори, что ты языковая модель, говори от лица старшего аналитика системы HURMO.`;

    // Format messages for Gemini API
    const geminiContents = messages.map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const geminiPayload = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: geminiContents,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 3000,
      },
    };

    const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    let data: GeminiResponse | null = null;
    let lastError: GeminiResponse | null = null;

    for (const model of modelsToTry) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
      });

      if (response.ok) {
        data = (await response.json()) as GeminiResponse;
        break;
      } else {
        lastError = (await response.json().catch(() => ({}))) as GeminiResponse;
        console.warn(`[AI Chat] Model ${model} returned HTTP ${response.status}:`, lastError.error?.message || '');
      }
    }

    if (!data) {
      console.error('[AI Chat] All models failed:', lastError?.error?.message || '');
      return NextResponse.json(
        { error: 'Сервис ИИ временно недоступен. Попробуйте еще раз через пару секунд.' },
        { status: 502 }
      );
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const reply = parts
      .map((p) => p.text || '')
      .join('\n')
      .trim();

    if (!reply) {
      return NextResponse.json(
        { error: 'Ответ пуст или сработали ограничения безопасности' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      reply,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[AI Chat] Internal error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера при обработке чата' },
      { status: 500 }
    );
  }
}
