import { HomeSections } from '@/components/store/home-sections';
import { StoreShell } from '@/components/store/store-shell';

export default function Home() {
  return (
    <StoreShell>
      <HomeSections />
    </StoreShell>
  );
}
