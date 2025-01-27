import React from 'react';
import { useSettings } from '~/lib/hooks/useSettings';

const ProvidersTab: React.FC = () => {
  const { providers } = useSettings();

  return (
    <div>
      {providers && Object.entries(providers).map(([key, _provider]) => <div key={key}>{/* Provider details */}</div>)}
    </div>
  );
};

export default ProvidersTab;
