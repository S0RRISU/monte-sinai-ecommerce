import { StoreShell } from '@/components/store/store-shell';
import { CategoryTiles, HomeSections } from '@/components/store/home-sections';

export default function Home() {
  return (
    <StoreShell>
      <CategoryTiles />
      <HomeSections />
    </StoreShell>
  );
}
