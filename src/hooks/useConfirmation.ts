import { useApp } from '../contexts/AppContext';

type ConfirmationOptions = {
  title?: string;
  message: string;
};

export const useConfirmation = () => {
  const { dispatch } = useApp();

  const getConfirmation = (options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      dispatch({
        type: 'SHOW_CONFIRMATION_MODAL',
        payload: {
          ...options,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        },
      });
    });
  };

  return { getConfirmation };
};
