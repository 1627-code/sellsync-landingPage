import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

type POItem = {
  id: number;
  name: string;
  qty: number;
  unitCost: number;
};

type BulkPOModalProps = {
  isOpen: boolean;
  onClose: () => void;
  items: POItem[];
};

export function BulkPOModal({ isOpen, onClose, items }: BulkPOModalProps) {
  const total = items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-3xl gap-0 border-none">
        <div className="bg-white">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-black text-gray-900">Generate Purchase Order</DialogTitle>
            <DialogDescription className="text-gray-500">Review items and confirm</DialogDescription>
          </DialogHeader>

          <div className="p-6">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-0">
                <ScrollArea className="h-[280px]">
                  <div className="p-6 space-y-3">
                    {items.map((i) => (
                      <div key={i.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                        <div>
                          <p className="font-medium text-gray-900">{i.name}</p>
                          <p className="text-xs text-gray-500">Qty: {i.qty} • Unit: ₦{i.unitCost.toFixed(2)}</p>
                        </div>
                        <p className="font-bold text-indigo-600">₦{(i.qty * i.unitCost).toFixed(2)}</p>
                      </div>
                    ))}
                    {items.length === 0 && <p className="text-sm text-gray-500">No items selected.</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-2xl font-black text-indigo-600">₦{total.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700">Confirm PO</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
