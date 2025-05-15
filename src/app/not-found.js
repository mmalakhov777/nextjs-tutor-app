export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md">
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="mb-8 text-slate-600">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <a 
          href="/" 
          className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
} 