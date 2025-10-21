import { PublicTestimonialsSlider } from "@/components/generic/PublicTestimonialsSlider";

interface PublicBusinessTestimonialsProps {
  businessId: string;
}

export function PublicBusinessTestimonials({ businessId }: PublicBusinessTestimonialsProps) {
  return <PublicTestimonialsSlider entityType="business" entityId={businessId} />;
}
