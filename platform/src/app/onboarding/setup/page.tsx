import { redirect } from 'next/navigation';
import { WIZARD_SLUGS } from '@/lib/onboarding/steps';

/** `/onboarding/setup` is just the front door to the first step. */
export default function SetupIndex() {
  redirect(`/onboarding/setup/${WIZARD_SLUGS[0]}`);
}
