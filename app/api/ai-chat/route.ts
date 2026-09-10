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

interface CandidatePart {
  text?: string;
}

interface Candidate {
  content?: {
    parts?: CandidatePart[];
  };
  finishReason?: string;
}

interface ServiceResponse {
  candidates?: Candidate[];
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
      console.error('[AI Chat] API Key is not configured on server');
      return NextResponse.json(
        { error: 'Ключ аналитического сервиса не настроен на сервере' },
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

    // Prepare rich operational context for the AI
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
${selectedRegion ? `- Географический фильтр: регион "${selectedRegion}"` : '- География: вся территория Узбекистана (14 областей)'}

ВОРОНКА ОПЕРАЦИЙ ЗА ВЫБРАННЫЙ ПЕРИОД:
1. Звонки операторов (numbers): ${calls.toLocaleString('ru-RU')}
2. Отправлено SMS верификации (Eskiz): ${sms.toLocaleString('ru-RU')} (конверсия из звонка: ${callToSmsConv}%)
3. Зарегистрировано в main_base: ${reg.toLocaleString('ru-RU')} (конверсия из SMS: ${smsToRegConv}%, сквозная: ${endToEndConv}%)
   - Зарегистрировано через операторов поддержки: ${support.toLocaleString('ru-RU')}
   - Завершено после повторных обращений: ${repeat.toLocaleString('ru-RU')}

СТРУКТУРА ПОТЕРЬ И ОТСЕВА:
- Отказы респондентов: ${declined.toLocaleString('ru-RU')} (${calls > 0 ? ((declined / calls) * 100).toFixed(1) : '0'}% от звонков)
- Уже зарегистрированы в боте ранее: ${alreadyReg.toLocaleString('ru-RU')}
- Ошибочные номера / не тот человек: ${wrongPerson.toLocaleString('ru-RU')}
- Не завершили регистрацию (таблица not_completed): ${notCompleted.toLocaleString('ru-RU')} за период (и 4 289 за всё время)

ДИАГНОСТИКА ТЕЛЕФОННОЙ БАЗЫ:
- Зарубежные номера (не +998): ${metrics.phoneDiagnostics?.foreign ?? 681}
- Усечённые номера (не хватает цифр): ${metrics.phoneDiagnostics?.truncated ?? 40}
- Повреждённые номера (мусор в поле): ${metrics.phoneDiagnostics?.corrupted ?? 3}
- Невалидные номера: ${metrics.phoneDiagnostics?.invalid ?? 0}

ДАННЫЕ АНОМАЛИЙ (ОТКЛОНЕНИЕ ОТ СРЕДНЕГО ЗА 4 НЕДЕЛИ):
- Звонки: ${metrics.anomalyData?.callsAnomaly?.current ?? calls}, базовое среднее 4 нед: ${metrics.anomalyData?.callsAnomaly?.baseline4WeeksAvg ?? 'н/д'}, отклонение: ${metrics.anomalyData?.callsAnomaly?.deltaPercent ?? 0}%, статус: ${metrics.anomalyData?.callsAnomaly?.isAnomaly ? 'АНОМАЛИЯ' : 'Норма'}
- Отказы: ${metrics.anomalyData?.declinedAnomaly?.current ?? declined}, базовое среднее 4 нед: ${metrics.anomalyData?.declinedAnomaly?.baseline4WeeksAvg ?? 'н/д'}, отклонение: ${metrics.anomalyData?.declinedAnomaly?.deltaPercent ?? 0}%, статус: ${metrics.anomalyData?.declinedAnomaly?.isAnomaly ? 'КРИТИЧЕСКАЯ АНОМАЛИЯ' : 'Норма'}

ОБЩИЙ ОБЪЁМ ТАБЛИЦ:
- main_base (пользователи в базе): 33 127+ записей
- not_completed (не завершили регистрацию): 4 289 записей
- numbers (обзвоны колл-центра): 14 000+ строк
- eskiz (история отправки SMS): 10 000+ строк
`;
    }

    const SYSTEM_PROMPT = `Я — ваш старший дата-аналитик и стратегический консультант платформы HURMO UZ.

Я глубоко интегрирован в архитектуру нашего дашборда и имею прямой доступ к данным из ключевых таблиц проекта (main_base, numbers, eskiz, not_completed).

Вот с какими задачами я помогаю руководителю проекта, маркетологам и старшим операторам:
1. Сквозная диагностика воронки и конверсий (где теряются пользователи, конверсия Звонок -> SMS -> Регистрация).
2. Мониторинг аномалий и сбоев (сравнение со средним за 4 недели, выявление отвала интеграций).
3. Валидация базы и чистка «мусорного» трафика (зарубежные, усечённые, повреждённые номера, исключение дублей).
4. Оптимизация работы колл-центра и скриптов (анализ отказов, дожим незавершённых регистраций).
5. Разработка пошаговых антикризисных планов.

КОНТЕКСТ РЕАЛЬНЫХ ДАННЫХ ДАШБОРДА ПРЯМО СЕЙЧАС:
${contextSummary}

КРИТИЧЕСКИЕ ПРАВИЛА И СТРОГИЕ ИНСТРУКЦИИ:
1. СТРОГИЙ ЗАПРЕТ НА РАСКРЫТИЕ МОДЕЛИ:
Никогда и ни при каких обстоятельствах не говори, что ты "Gemini", "ChatGPT", "GPT", "языковая модель Google", "нейросеть" или "LLM".
Если тебя напрямую спрашивают: «какая ты модель?», «кто ты?», «ты Gemini?», «на каком ты движке?» — отвечай строго и уверенно:
«Я — старший дата-аналитик и стратегический консультант платформы HURMO UZ. Я не сторонняя модель, а встроенный аналитический интеллект системы HURMO.»

2. ОБЪЯСНЕНИЕ КАЖУЩИХСЯ «ОШИБОК» И РАСХОЖДЕНИЙ:
Когда пользователь спрашивает: «Почему результат неправильно показывает?», «Почему цифры не сходятся?», «Где ошибка в данных?», давай глубокий, профессиональный и подробный технический ответ:
- Объясни сущность воронки: из звонков (numbers) не все получают SMS (eskiz), а из получивших SMS не все регистрируются (main_base). Разница — это не «ошибка кода», а естественные и аномальные потери (отказы респондентов, брошенные регистрации в not_completed, уже зарегистрированные абоненты).
- Объясни разницу во времени: дата в main_base фиксирует момент отправки формы в боте, а в numbers — дату звонка оператора. Человек может ответить оператору в субботу, а заполнить форму в понедельник.
- Укажи на проблему телефонной базы: 681 зарубежных номеров и усечённые номера, на которые операторы тратят ресурсы впустую.
- Посоветуй проверить сырые строки в [Сырые таблицы](/raw) или детальный лог звонков в [Операционная воронка](/dashboard).

3. НАВИГАЦИЯ ПО САЙТУ И ССЫЛКИ:
Если пользователь не может что-то найти или ты рекомендуешь проверить срез, ВСЕГДА предоставляй прямые markdown-ссылки:
- [Главная](/overview) — сводный обзор KPI и алерты по аномалиям
- [Операционная воронка](/dashboard) — воронка звонков, отказов, конверсий и детализация по периодам
- [BI-аналитика](/analytics) — демографические срезы (пол, возраст, образование, статус)
- [Карта регионов](/map) — интерактивная карта 14 областей Узбекистана
- [Сырые таблицы](/raw) — прямой просмотр всех строк 4-х Google Таблиц, поиск по номеру и экспорт в Excel/CSV
- [Настройки](/settings) — пороги аномалий, качество данных, Telegram-уведомления
- [ИИ-Аналитик](/chat) — полноэкранный стратегический консультант

5. ИНТЕЛЛЕКТУАЛЬНЫЙ АНАЛИЗ СТАТУСОВ И ОПЕРАТОРСКИХ КОММЕНТАРИЕВ (FUZZY & DYNAMIC MATCHING):
- В нашей системе НЕТ жесткой статичной привязки к точным словам. Операторы часто пишут с опечатками, на узбекском латиницей или кириллицей, удлиняют гласные или согласные:
  * Например, статус «otkaaaz», «otkaaaazzzz», «откаааз», «rad etttttdiiii», «vaaaqqqtii yoqqq», «kerakmaaaas» — система АВТОМАТИЧЕСКИ и на лету распознаёт как **ОТКАЗ (declined)**, потому что задействован алгоритм сжатия повторяющихся символов (collapse repeated characters), транслитерация кириллицы/латиницы и семантическое выявление корней (otkaz, rad, kerak, vaqt, foydalan, xohla и др.).
  * «silkaaa yuborildiii», «sms ketdi» -> распознаётся как **SMS / ссылка отправлена (linkSent)**.
  * «qaytaaa», «povtor» -> **повторный звонок (repeatSent)**.
  * «royxatdan otgan», «oldin ulangan» -> **уже зарегистрирован (alreadyRegistered)**.
  * «boshqaaa odam», «notogri tushdim», «xatooo» -> **ошибочный номер / не тот человек (wrongPerson)**.
- Если тебя спрашивают про статус (например: «как считается otkaaaz?», «почему otkaaaz это отказ?», «понимаешь ли ты статусы в таблице numbers?», «знаешь ли ты всю таблицу?»):
  * Подтверди, что ты полностью знаешь структуру всей таблицы \`numbers\` (колонки: Дата, Телефон, Коментарий/Статус, Оператор) и всех подключённых Google-таблиц (\`main_base\`, \`eskiz\`, \`not_completed\`).
  * Объясни, что дашборд не проверяет статусы по «статичному списку». Встроенный семантический анализатор отсекает дубли букв, транслитерирует узбекские и русские варианты и классифицирует любой нестандартный статус (включая «otkaaaz», «rad ettttddii» и т.д.) в соответствующую категорию воронки без потери данных.

6. ТОНАЛЬНОСТЬ И ФОРМАТ:
Отвечай профессионально, авторитетно, структурированно, без воды, используя жирный шрифт для ключевых терминов и цифр, маркированные списки и чёткие рекомендации. Пиши на чистом русском языке.`;

    // Map messages for the AI service
    const serviceContents = messages.map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const payload = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: serviceContents,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 3000,
      },
    };

    const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    let data: ServiceResponse | null = null;
    let lastError: ServiceResponse | null = null;

    for (const model of modelsToTry) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        data = (await response.json()) as ServiceResponse;
        break;
      } else {
        lastError = (await response.json().catch(() => ({}))) as ServiceResponse;
        console.warn(`[AI Chat] Model ${model} returned HTTP ${response.status}:`, lastError.error?.message || '');
      }
    }

    if (!data) {
      console.error('[AI Chat] All models failed:', lastError?.error?.message || '');
      return NextResponse.json(
        { error: 'Сервис аналитики временно недоступен. Попробуйте еще раз через пару секунд.' },
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
