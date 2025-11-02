// Referenced from blueprint:javascript_object_storage
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: any // Type resolved at runtime
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy, setUppy] = useState<any>(null);
  const [DashboardModal, setDashboardModal] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (showModal && !uppy && !isLoading) {
      setIsLoading(true);
      // Dynamically import Uppy libraries only when modal is opened
      void Promise.all([
        import("@uppy/core"),
        import("@uppy/react"),
        import("@uppy/aws-s3")
      ]).then(([{ default: Uppy }, { DashboardModal: Modal }, { default: AwsS3 }]) => {
        const uppyInstance = new Uppy({
          restrictions: {
            maxNumberOfFiles,
            maxFileSize,
            allowedFileTypes: ['image/*'],
          },
          autoProceed: false,
        })
          .use(AwsS3, {
            shouldUseMultipart: false,
            getUploadParameters: onGetUploadParameters,
          })
          .on("complete", (result) => {
            onComplete?.(result);
            setShowModal(false);
          });
        
        setUppy(uppyInstance);
        setDashboardModal(() => Modal);
        setIsLoading(false);
      });
    }

    return () => {
      if (uppy) {
        uppy.reset();
        uppy.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, uppy]); // uppy included but we intentionally only recreate when showModal changes

  return (
    <div>
      <Button 
        type="button"
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        data-testid="button-upload-image"
      >
        {children}
      </Button>

      {!!showModal && (
        <>
          {isLoading ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-white">Loading uploader...</p>
              </div>
            </div>
          ) : (
            DashboardModal && uppy && (
              <DashboardModal
                uppy={uppy}
                open={showModal}
                onRequestClose={() => setShowModal(false)}
                proudlyDisplayPoweredByUppy={false}
              />
            )
          )}
        </>
      )}
    </div>
  );
}