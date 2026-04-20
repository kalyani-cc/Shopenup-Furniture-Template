import { ReactNode } from "react";

type SectionTitleProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionTitle({ title, description, action }: SectionTitleProps) {
  return (
    <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-stone-900">{title}</h2>
        {description ? <p className="mt-2 text-stone-600">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
