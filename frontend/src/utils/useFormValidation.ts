import { useFormik, FormikConfig, FormikHelpers, FormikValues } from 'formik';
import { useNotification } from '../context/NotificationContext';
import { useState } from 'react';

interface UseFormValidationProps<T extends FormikValues> extends Omit<FormikConfig<T>, 'onSubmit'> {
  onSubmit: (values: T, formikHelpers: FormikHelpers<T>) => Promise<void> | void;
  successMessage?: string;
  showSuccessNotification?: boolean;
  showErrorNotification?: boolean;
}

/**
 * Custom hook for form validation with consistent error handling
 * 
 * @param props FormikConfig plus additional options for notifications
 * @returns Formik instance plus additional validation state
 */
export function useFormValidation<T extends FormikValues>({
  onSubmit,
  successMessage = 'Operation completed successfully',
  showSuccessNotification = true,
  showErrorNotification = true,
  ...formikConfig
}: UseFormValidationProps<T>) {
  const { addNotification } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (values: T, formikHelpers: FormikHelpers<T>) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await onSubmit(values, formikHelpers);
      setSubmitSuccess(true);
      
      if (showSuccessNotification) {
        addNotification(successMessage, 'success');
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      setSubmitError(errorMessage);
      
      if (showErrorNotification) {
        addNotification(errorMessage, 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formik = useFormik({
    ...formikConfig,
    onSubmit: handleSubmit,
  });

  return {
    formik,
    isSubmitting,
    submitError,
    submitSuccess,
    resetSubmitState: () => {
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  };
}

export default useFormValidation; 