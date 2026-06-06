import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  Svg,
  Line,
} from "@react-pdf/renderer";
import type { BrandKitResultsData } from "../results/brand-kit-results";



// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hexToRgb(hex: string) {
  const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return res ? { r: parseInt(res[1], 16), g: parseInt(res[2], 16), b: parseInt(res[3], 16) } : { r: 0, g: 0, b: 0 };
}

function hexToCmyk(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  let c = 1 - r / 255, m = 1 - g / 255, y = 1 - b / 255;
  let k = Math.min(c, m, y);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  c = Math.round(((c - k) / (1 - k)) * 100);
  m = Math.round(((m - k) / (1 - k)) * 100);
  y = Math.round(((y - k) / (1 - k)) * 100);
  k = Math.round(k * 100);
  return { c, m, y, k };
}

function contrastText(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#0a0a0a" : "#ffffff";
}

// ---------------------------------------------------------------------------
// Styles — generous whitespace, editorial layout
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  page: { flexDirection: "column", fontFamily: "Helvetica", backgroundColor: "#fff" },

  /* ── Cover ── */
  coverAccentBar: { position: "absolute", top: 0, right: 0, width: "40%", height: "100%" },
  coverInner: { flex: 1, backgroundColor: "#0a0a0a", justifyContent: "flex-end", paddingHorizontal: 65, paddingBottom: 65 },

  /* ── Content pages ── */
  content: { paddingTop: 65, paddingBottom: 65, paddingHorizontal: 65 },

  /* ── Section header ── */
  chapterLabel: { fontSize: 8, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: "#bbb", marginBottom: 6 },
  chapterTitle: { fontSize: 26, fontWeight: 700, color: "#0a0a0a", marginBottom: 8 },
  accent: { width: 36, height: 2.5, marginBottom: 22 },
  bodyText: { fontSize: 10, lineHeight: 1.75, color: "#666", marginBottom: 22 },

  /* ── Quote ── */
  quoteWrap: { borderLeft: "3pt solid #0a0a0a", paddingLeft: 20, marginTop: 10, marginBottom: 30 },
  quoteText: { fontSize: 20, fontWeight: 400, color: "#111", fontStyle: "italic", lineHeight: 1.5 },

  /* ── Color swatch row ── */
  swatchBand: { height: 72, position: "relative" },
  swatchName: { position: "absolute", bottom: 10, left: 16, fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 },
  specRow: { flexDirection: "row", gap: 22, paddingHorizontal: 16, paddingVertical: 8 },
  specLabel: { fontSize: 7, fontWeight: 700, color: "#bbb", letterSpacing: 1, marginBottom: 1 },
  specVal: { fontSize: 8.5, color: "#333" },

  /* ── Typography ── */
  typeRole: { fontSize: 8, fontWeight: 700, color: "#bbb", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 },
  typeFamily: { fontSize: 36, fontWeight: 700, color: "#0a0a0a", letterSpacing: -0.5, marginBottom: 6 },
  typeAlphabet: { fontSize: 12, lineHeight: 1.9, color: "#555" },

  /* ── Logo ── */
  logoVariGrid: { flexDirection: "row", flexWrap: "wrap", gap: 22 },
  logoVariItem: { width: "46%", alignItems: "center", padding: 20, marginBottom: 14 },
  logoVariLabel: { fontSize: 8, fontWeight: 600, color: "#aaa", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 12 },

  /* ── Footer (back cover) ── */
  footerBar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 36, backgroundColor: "#0a0a0a", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 65 },
  footerTxt: { fontSize: 6.5, color: "#666", letterSpacing: 2, textTransform: "uppercase" },

  /* ── Page number ── */
  pageNum: { position: "absolute", bottom: 22, right: 65, fontSize: 8, color: "#ccc" },
});

// ---------------------------------------------------------------------------
// Shared sub-components (outside render)
// ---------------------------------------------------------------------------
const Hairline = () => (
  <Svg height={1} width="100%"><Line x1="0" y1="0.5" x2="595" y2="0.5" strokeWidth={0.5} stroke="#eee" /></Svg>
);

const ChapterHead: React.FC<{ label: string; title: string; accentColor: string }> = ({ label, title, accentColor }) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={s.chapterLabel}>{label}</Text>
    <Text style={s.chapterTitle}>{title}</Text>
    <View style={[s.accent, { backgroundColor: accentColor }]} />
  </View>
);

const Pg = () => (
  <Text style={s.pageNum} render={({ pageNumber }) => String(pageNumber).padStart(2, "0")} fixed />
);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export const BrandGuidelinesPDF: React.FC<{ data: BrandKitResultsData }> = ({ data }) => {
  const brandName = data.brandName || "Brand Kit";
  const primaryLogo = data.logoVariations?.length ? data.logoVariations[0].url : data.logoUrl;
  const accent = data.colorPalette.length > 0 ? data.colorPalette[0].hex : "#0a0a0a";

  return (
    <Document>

      {/* ================================================================ */}
      {/* COVER                                                            */}
      {/* ================================================================ */}
      <Page size="A4" style={s.page}>
        <View style={[s.coverAccentBar, { backgroundColor: accent }]} />
        <View style={s.coverInner}>
          {primaryLogo && (
            <Image src={primaryLogo} style={{ width: 150, objectFit: "contain", marginBottom: 45 }} />
          )}
          <Text style={{ fontSize: 48, fontWeight: 700, color: "#fff", letterSpacing: 1, marginBottom: 8 }}>
            {brandName}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: 600, letterSpacing: 7, textTransform: "uppercase", color: "#666" }}>
            Brand Guidelines
          </Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* 01 — BRAND DNA                                                   */}
      {/* ================================================================ */}
      {data.brandPresentation && (data.brandPresentation.tagline || data.brandPresentation.description) && (
        <Page size="A4" style={[s.page, s.content]}>
          <ChapterHead label="01 — Brand DNA" title="Identity & Voice" accentColor={accent} />

          {data.brandPresentation.tagline && (
            <View style={s.quoteWrap}>
              <Text style={s.quoteText}>
                &ldquo;{data.brandPresentation.tagline}&rdquo;
              </Text>
            </View>
          )}

          {data.brandPresentation.description && (
            <Text style={s.bodyText}>{data.brandPresentation.description}</Text>
          )}
          <Pg />
        </Page>
      )}

      {/* ================================================================ */}
      {/* 02 — LOGO SYSTEM                                                 */}
      {/* ================================================================ */}
      <Page size="A4" style={[s.page, s.content]}>
        <ChapterHead label="02 — Logo System" title="Primary & Alternate Marks" accentColor={accent} />
        <Text style={s.bodyText}>
          The logo must remain unaltered at all times, maintaining its original proportions with adequate clear space surrounding it.
        </Text>

        {/* Primary Logo — clean, centered, generous whitespace */}
        {primaryLogo && (
          <View wrap={false} style={{ alignItems: "center", paddingVertical: 40, marginBottom: 20 }}>
            <Image src={primaryLogo} style={{ width: "100%", maxWidth: 300, objectFit: "contain" }} />
          </View>
        )}

        {/* Variations */}
        {data.logoVariations && data.logoVariations.length > 1 && (
          <View wrap={false}>
            <Text style={[s.chapterLabel, { marginBottom: 12 }]}>Alternate Marks</Text>
            <View style={s.logoVariGrid}>
              {data.logoVariations.slice(1).map((v, i) => (
                <View key={i} style={s.logoVariItem}>
                  <Image src={v.url} style={{ width: "100%", height: 85, objectFit: "contain" }} />
                  <Text style={s.logoVariLabel}>{v.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <Pg />
      </Page>

      {/* ================================================================ */}
      {/* 03 — COLOR PALETTE                                               */}
      {/* ================================================================ */}
      <Page size="A4" style={[s.page, s.content]}>
        <ChapterHead label="03 — Color Palette" title="Brand Colors" accentColor={accent} />
        <Text style={s.bodyText}>
          Never approximate — always reference these precise values for both digital and print reproduction.
        </Text>

        {data.colorPalette.map((color, idx) => {
          const rgb = hexToRgb(color.hex);
          const cmyk = hexToCmyk(color.hex);
          return (
            <View key={idx} wrap={false} style={{ marginBottom: 4 }}>
              <View style={[s.swatchBand, { backgroundColor: color.hex }]}>
                <Text style={[s.swatchName, { color: contrastText(color.hex) }]}>
                  {color.role || `Color ${idx + 1}`}
                </Text>
              </View>
              <View style={s.specRow}>
                <View><Text style={s.specLabel}>HEX</Text><Text style={s.specVal}>{color.hex.toUpperCase()}</Text></View>
                <View><Text style={s.specLabel}>RGB</Text><Text style={s.specVal}>{rgb.r} / {rgb.g} / {rgb.b}</Text></View>
                <View><Text style={s.specLabel}>CMYK</Text><Text style={s.specVal}>{cmyk.c} / {cmyk.m} / {cmyk.y} / {cmyk.k}</Text></View>
              </View>
              <Hairline />
            </View>
          );
        })}
        <Pg />
      </Page>

      {/* ================================================================ */}
      {/* 04 — TYPOGRAPHY                                                  */}
      {/* ================================================================ */}
      {(data.typography?.heading || data.typography?.body) && (
        <Page size="A4" style={[s.page, s.content]}>
          <ChapterHead label="04 — Typography" title="Typefaces" accentColor={accent} />
          <Text style={s.bodyText}>
            These typefaces are mandatory for all brand communications across print and digital.
          </Text>

          {data.typography.heading && (
            <View style={{ marginBottom: 40 }} wrap={false}>
              <Text style={s.typeRole}>Primary Typeface</Text>
              <Text style={s.typeFamily}>{data.typography.heading.family}</Text>
              <View style={{ width: 40, height: 2, backgroundColor: accent, marginBottom: 14 }} />
              <Text style={s.typeAlphabet}>
                A B C D E F G H I J K L M N O P Q R S T U V W X Y Z{"\n"}
                a b c d e f g h i j k l m n o p q r s t u v w x y z{"\n"}
                0 1 2 3 4 5 6 7 8 9
              </Text>
            </View>
          )}

          {data.typography.body && (
            <View style={{ marginBottom: 40 }} wrap={false}>
              <Text style={s.typeRole}>Secondary Typeface</Text>
              <Text style={s.typeFamily}>{data.typography.body.family}</Text>
              <View style={{ width: 40, height: 2, backgroundColor: accent, marginBottom: 14 }} />
              <Text style={s.typeAlphabet}>
                A B C D E F G H I J K L M N O P Q R S T U V W X Y Z{"\n"}
                a b c d e f g h i j k l m n o p q r s t u v w x y z{"\n"}
                0 1 2 3 4 5 6 7 8 9
              </Text>
            </View>
          )}
          <Pg />
        </Page>
      )}

      {/* ================================================================ */}
      {/* BACK COVER                                                       */}
      {/* ================================================================ */}
      <Page size="A4" style={s.page}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" }}>
          {primaryLogo && (
            <Image src={primaryLogo} style={{ width: 80, objectFit: "contain", opacity: 0.12, marginBottom: 18 }} />
          )}
          <Text style={{ fontSize: 9, fontWeight: 600, letterSpacing: 5, textTransform: "uppercase", color: "#555" }}>
            {brandName}
          </Text>
        </View>
        <View style={s.footerBar}>
          <Text style={s.footerTxt}>Brand Guidelines</Text>
          <Text style={s.footerTxt}>
            Generated by QuickLogo • {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}
          </Text>
        </View>
      </Page>

    </Document>
  );
};

export default BrandGuidelinesPDF;
