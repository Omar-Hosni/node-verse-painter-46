
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from '@/store/useCanvasStore';

interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
  apiKey: string | null;
  onSave: (apiKey: string) => void;
}

export const ApiKeyModal = ({ open, onClose, apiKey, onSave }: ApiKeyModalProps) => {
  const [inputApiKey, setInputApiKey] = useState('');
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (apiKey) {
      setInputApiKey(apiKey);
    }
  }, [apiKey]);

  const handleSubmit = () => {
    if (!inputApiKey.trim()) {
      setError('API Key is required');
      return;
    }

    onSave(inputApiKey.trim());
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}>
      <DialogContent className="sm:max-w-[425px] bg-sidebar text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Enter Runway API Key</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="apiKey" className="text-sm text-gray-300">
              API Key
            </label>
            <Input
              id="apiKey"
              placeholder="Enter your Runway API key"
              value={inputApiKey}
              onChange={(e) => {
                setInputApiKey(e.target.value);
                setError('');
              }}
              className="bg-field border-none focus:ring-primary"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <p className="text-xs text-gray-400 mt-1">
              Find your API key at <a href="https://runwayml.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">runwayml.com</a> in the API keys section.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSubmit}
            className="bg-primary hover:bg-blue-600 text-white"
          >
            Save API Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyModal;
