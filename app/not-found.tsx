import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 text-3xl font-black mb-6">
        404
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Страница не найдена</h1>
      <p className="text-gray-400 max-w-md mb-8 text-sm leading-relaxed">
        У вас нет доступа к этой странице или запрашиваемый адрес не существует в системе HURMO UZ.
      </p>
      <Link
        href="/overview"
        className="px-6 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-accent/20"
      >
        Вернуться на главную
      </Link>
    </div>
  );
}
