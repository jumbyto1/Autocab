import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Settings } from "lucide-react";

interface PriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCost: number;
  currentPrice: number;
  onSave: (cost: number, price: number) => void;
}

export function PriceEditModal({ 
  isOpen, 
  onClose, 
  currentCost, 
  currentPrice, 
  onSave 
}: PriceEditModalProps) {
  const [cost, setCost] = useState(currentCost.toString());
  const [price, setPrice] = useState(currentPrice.toString());

  const handleSave = () => {
    const costValue = parseFloat(cost) || 0;
    const priceValue = parseFloat(price) || 0;
    onSave(costValue, priceValue);
    onClose();
  };

  const handleRemove = () => {
    setCost("0");
    setPrice("0");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="bg-slate-600 text-white p-4 -m-6 mb-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <DialogTitle className="text-white">Edit Pricing</DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-slate-700 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-2">
          {/* Cost Field */}
          <div className="space-y-2">
            <Label htmlFor="cost" className="text-sm font-medium">
              Cost
            </Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full"
              placeholder="0.00"
            />
          </div>

          {/* Price Field */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-medium">
              Price
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 mt-6 bg-gray-200 p-3 -m-6 rounded-b-lg">
          <Button 
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-6"
          >
            OK
          </Button>
          <Button 
            onClick={handleRemove}
            variant="destructive"
            className="px-6"
          >
            Remove
          </Button>
          <Button 
            onClick={onClose}
            variant="outline"
            className="px-6"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}