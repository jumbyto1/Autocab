import { AutocabInterface } from '@/components/autocab-new/autocab-interface';
import { AutocabInterfaceMobile } from '@/components/autocab-new/autocab-interface-mobile';
import { useMediaQuery } from '@/hooks/use-media-query';

export default function AutocabInterfacePage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  console.log(`📱 AUTOCAB INTERFACE PAGE: isMobile=${isMobile}, window.innerWidth=${window.innerWidth}`);
  
  // Use desktop version for desktop screens, mobile version for mobile screens
  return isMobile ? <AutocabInterfaceMobile isMobile={isMobile} /> : <AutocabInterface />;
}