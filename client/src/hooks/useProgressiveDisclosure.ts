// This hook is now just a re-export of the context-based implementation
// All progressive disclosure state is managed centrally through the context provider
export { 
  useProgressiveDisclosure, 
  useProgressiveSection 
} from '@/contexts/ProgressiveDisclosureContext';