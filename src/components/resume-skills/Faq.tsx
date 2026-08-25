import { Plus } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type FaqItem = { q: string; a: string };

export default function Faq({ items }: { items: FaqItem[] }) {
  return (
    <Accordion type="single" collapsible defaultValue="faq-0" className="faq">
      {items.map((f, i) => (
        <AccordionItem key={i} value={`faq-${i}`} className="faq-item">
          <AccordionTrigger className="faq-q">
            <span>{f.q}</span>
            <span className="faq-icon" aria-hidden="true">
              <Plus size={12} />
            </span>
          </AccordionTrigger>
          <AccordionContent className="faq-a">
            <div className="faq-a-inner">{f.a}</div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
