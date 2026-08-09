export default function Footer() {
  return (
    <footer className="border-t border-gray-200/60 bg-white px-6 py-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <span className="text-xs text-text-muted">
          &copy; {new Date().getFullYear()} Study Coach
        </span>
        <span className="text-xs text-text-muted">
          Built with care for{" "}
          <span className="text-accent">AI Factory Hackathon</span>
        </span>
      </div>
    </footer>
  );
}