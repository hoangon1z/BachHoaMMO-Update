import { Suspense } from 'react';
import { BlogsPageContent } from './BlogsPageContent';
import { FileText } from 'lucide-react';

function BlogsPageFallback() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="h-16 border-b border-gray-200 bg-white" />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500 text-sm">Đang tải...</p>
        </div>
      </main>
      <div className="h-24 border-t border-gray-200 bg-gray-50" />
    </div>
  );
}

export default function BlogsPage() {
  return (
    <Suspense fallback={<BlogsPageFallback />}>
      <BlogsPageContent />
    </Suspense>
  );
}
