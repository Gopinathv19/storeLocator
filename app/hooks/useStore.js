import { useState } from 'react';
import { useSubmit } from '@remix-run/react';

export function useStore() {
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const submit = useSubmit();

  const handleAddStore = async (storeData) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('intent', 'createStore');
      formData.append('store', JSON.stringify(storeData));
      await submit(formData, { method: 'post', replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    isAddingStore,
    setIsAddingStore,
    loading,
    error,
    handleAddStore
  };
}