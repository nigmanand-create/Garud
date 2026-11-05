import { BlogIndexView } from '@/components/blog/BlogViews';

export const metadata = {
  title: 'Insights & Blog | GarudHub',
  description:
    'Drone industry news, DGCA guides, training and careers, agriculture UAVs, and commercial drone insights from GarudHub.',
};

export default function BloggingIndexPage() {
  return <BlogIndexView />;
}
