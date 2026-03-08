import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, Share2, QrCode } from "lucide-react";
import { toast } from "sonner";

interface EmergencyQRSectionProps {
  emergencyToken: string;
  patientName: string;
  bloodGroup: string | null;
  allergies: string[] | null;
  emergencyContact: string | null;
}

const EmergencyQRSection = ({ emergencyToken, patientName, bloodGroup, allergies, emergencyContact }: EmergencyQRSectionProps) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const emergencyUrl = `https://medcircle-family-guardian.lovable.app/emergency/${emergencyToken}`;

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    canvas.width = 512;
    canvas.height = 512;
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      const link = document.createElement("a");
      link.download = `MedCircle-Emergency-QR-${patientName}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("QR Code downloaded!");
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data)));
  };

  const printCard = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const svg = qrRef.current?.querySelector("svg");
    const svgData = svg ? new XMLSerializer().serializeToString(svg) : "";
    printWindow.document.write(`
      <html><head><title>Emergency Card - ${patientName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
        body { display: flex; justify-content: center; padding: 20px; }
        .card { width: 85.6mm; height: 53.98mm; border: 2px solid #dc2626; border-radius: 8px; padding: 10px; display: flex; gap: 10px; }
        .left { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .right { width: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .name { font-size: 14px; font-weight: 900; color: #111; }
        .blood { font-size: 24px; font-weight: 900; color: #dc2626; }
        .label { font-size: 8px; color: #666; text-transform: uppercase; font-weight: 700; margin-top: 4px; }
        .value { font-size: 10px; font-weight: 700; color: #111; }
        .allergy { background: #fecaca; color: #dc2626; font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block; margin: 1px; }
        .footer { font-size: 6px; color: #999; text-align: center; margin-top: 4px; }
        .qr svg { width: 70px; height: 70px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="card">
        <div class="left">
          <div>
            <div class="name">${patientName}</div>
            <div class="blood">${bloodGroup || "?"}</div>
          </div>
          <div>
            <div class="label">Allergies</div>
            <div>${(allergies || []).map(a => `<span class="allergy">${a}</span>`).join(" ")}</div>
          </div>
          <div>
            <div class="label">Emergency Contact</div>
            <div class="value">${emergencyContact || "N/A"}</div>
          </div>
          <div class="footer">MedCircle Family Guardian</div>
        </div>
        <div class="right">
          <div class="qr">${svgData}</div>
          <div class="label" style="margin-top:4px">Scan for full profile</div>
        </div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const shareQR = async () => {
    const text = `🚨 Emergency Health Card for ${patientName}\n\nScan this QR or open the link to see complete health profile:\n${emergencyUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Emergency Card - ${patientName}`, text, url: emergencyUrl });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div className="px-4 mt-6">
      <div className="bg-card rounded-[18px] p-5 shadow-sm" style={{ borderLeft: "4px solid #dc2626" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
            <QrCode size={16} className="text-destructive" />
          </div>
          <h3 className="font-heading font-bold text-base text-foreground">Emergency QR Code</h3>
        </div>

        {/* QR Code */}
        <div ref={qrRef} className="flex justify-center py-4">
          <div className="bg-white p-4 rounded-2xl shadow-inner">
            <QRCodeSVG
              value={emergencyUrl}
              size={200}
              level="H"
              includeMargin
              fgColor="#111827"
            />
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-2 mb-4 px-2">
          Show this QR code to any doctor in an emergency. They can scan it to see your complete health profile instantly.
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={downloadQR}
            className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <Download size={18} className="text-primary" />
            <span className="text-[11px] font-semibold text-primary">Download</span>
          </button>
          <button
            onClick={printCard}
            className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 transition-colors"
          >
            <Printer size={18} className="text-[#8b5cf6]" />
            <span className="text-[11px] font-semibold text-[#8b5cf6]">Print Card</span>
          </button>
          <button
            onClick={shareQR}
            className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 transition-colors"
          >
            <Share2 size={18} className="text-[#f59e0b]" />
            <span className="text-[11px] font-semibold text-[#f59e0b]">Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyQRSection;
