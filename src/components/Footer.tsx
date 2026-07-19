export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">
        &copy; {year} Baby Tracker
      </p>
    </footer>
  );
}
