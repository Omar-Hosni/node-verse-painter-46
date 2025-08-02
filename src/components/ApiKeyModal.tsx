
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from '@/store/useCanvasStore';

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApiKeyModal = ({ open, onOpenChange }: ApiKeyModalProps) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const setRunwareApiKey = useCanvasStore(state => state.setRunwareApiKey);
  const storedApiKey = useCanvasStore(state => state.runwareApiKey);

  useEffect(() => {
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, [storedApiKey]);

  const handleSubmit = () => {
    if (!apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    setRunwareApiKey(apiKey.trim());
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-sidebar text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Enter Runware API Key</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="apiKey" className="text-sm text-gray-300">
              API Key
            </label>
            <Input
              id="apiKey"
              placeholder="Enter your Runware API key"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError('');
              }}
              className="bg-field border-none focus:ring-primary"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <p className="text-xs text-gray-400 mt-1">
              Find your API key at <a href="https://runware.ai/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">runware.ai</a> in the API keys section.
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
