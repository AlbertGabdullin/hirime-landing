import { Toaster } from '@/components/ui/sonner';

/** Single Sonner toaster for the page; toast() calls from any island reach it. */
export default function ToasterMount() {
  return <Toaster position="bottom-center" richColors={false} />;
}
