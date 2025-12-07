export interface ModalHeaderProps {
  goBack?: boolean;
  onGoBack?: () => void;
  title: string;
  onClose?: () => void;
  hideCloseButton?: boolean;
}

// Re-export from web version for TypeScript type generation
// At runtime, the correct platform file will be used via esbuild's resolveExtensions
export * from "./ModalHeader.web";
