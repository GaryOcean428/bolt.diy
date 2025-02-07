import React from 'react';
import type { Template } from '~/types/template';

interface FrameworkLinkProps {
  template: Template;
}

const FrameworkLink: React.FC<FrameworkLinkProps> = ({ template }) => (
  <a
    href={`/git?url=https://github.com/${template.githubRepo}.git`}
    data-state="closed"
    data-discover="true"
    title={`Start a new ${template.name} project`}
    className="items-center justify-center "
  >
    <div
      className={`inline-block ${template.icon} w-8 h-8 text-4xl transition-theme opacity-25 hover:opacity-75 transition-all`}
    />
  </a>
);

const templates: Template[] = [
  {
    name: 'React',
    description: 'Create a modern React application',
    label: 'React',
    githubRepo: 'facebook/react',
    icon: 'react-icon',
  },
  {
    name: 'Next.js',
    description: 'Build a Next.js application',
    label: 'Next.js',
    githubRepo: 'vercel/next.js',
    icon: 'nextjs-icon',
  },

  // Add other templates with required properties
];

const StarterTemplates: React.FC = () => {
  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-sm text-gray-500">or start a blank app with your favorite stack</span>
      <div className="flex justify-center">
        <div className="flex w-70 flex-wrap items-center justify-center gap-4">
          {templates.map((template) => (
            <FrameworkLink key={template.name} template={template} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StarterTemplates;
