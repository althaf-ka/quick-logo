import { useState } from "react";
import { toast } from "@quicklogo/ui/components/sonner";
import type { BrandKitResultsData } from "../../components/brand-kit/results/brand-kit-results";

export function useExportBrandKit() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<"zip" | "pdf" | null>(null);

  const exportZip = async (data: BrandKitResultsData) => {
    try {
      setIsExporting(true);
      setExportType("zip");
      const { exportBrandKitToZip } = await import("../../features/export/export-zip");
      await exportBrandKitToZip(data);
    } catch (error) {
      console.error("Failed to export ZIP:", error);
      toast.error("Failed to generate ZIP archive. Please try again.");
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const exportPdf = async (data: BrandKitResultsData) => {
    try {
      setIsExporting(true);
      setExportType("pdf");
      
      // Dynamically load react-pdf to avoid initial bundle bloat
      const { pdf } = await import("@react-pdf/renderer");
      const { BrandGuidelinesPDF } = await import("../../components/brand-kit/export/brand-guidelines-pdf");
      
      const asPdf = pdf();
      asPdf.updateContainer(<BrandGuidelinesPDF data={data} />);
      const blob = await asPdf.toBlob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeBrandName = (data.brandName || "Brand Kit").toLowerCase().replace(/\s+/g, "-");
      a.download = `${safeBrandName}-guidelines.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export PDF:", error);
      toast.error("Failed to generate PDF document. Please try again.");
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return {
    isExporting,
    exportType,
    exportZip,
    exportPdf,
  };
}
