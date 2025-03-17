import { useState, useCallback } from 'react';
import { csvReader } from '../utils/csvHelper';

export function useCSVImport() {
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [parsedData, setParsedData] = useState(null);
  const [showFieldSelection, setShowFieldSelection] = useState(false);

  const handleFileUpload = useCallback(async (file) => {
    const parsedData = await csvReader(file);
    const headers = Object.keys(parsedData[0]);
    setCsvHeaders(headers);
    setParsedData(parsedData);
    setShowFieldSelection(true);
  }, []);

  return {
    csvHeaders,
    selectedFields,
    parsedData,
    showFieldSelection,
    handleFileUpload,
    setSelectedFields
  };
}