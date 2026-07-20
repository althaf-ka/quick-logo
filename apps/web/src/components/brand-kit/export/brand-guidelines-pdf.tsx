import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Line,
} from "@react-pdf/renderer";
import type { BrandKitResultsData } from "../results/brand-kit-results";
import { buildBrandGuidelinesViewModel } from "@/lib/brand-kit/build-brand-guidelines-view-model";

function getPdfFontWeight(weight: string, fallback: number) {
  const numericWeight = Number.parseInt(weight, 10);
  if (Number.isFinite(numericWeight)) return numericWeight;
  return weight.toLowerCase() === "bold" ? 700 : fallback;
}

// ---------------------------------------------------------------------------
// Styles — generous whitespace, editorial layout
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  page: {
    flexDirection: "column",
    fontFamily: "Helvetica",
    backgroundColor: "#fff",
  },

  /* ── Cover ── */
  coverAccentBar: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "40%",
    height: "100%",
  },
  coverInner: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "flex-end",
    paddingHorizontal: 65,
    paddingBottom: 65,
  },

  /* ── Content pages ── */
  content: { paddingTop: 65, paddingBottom: 65, paddingHorizontal: 65 },

  /* ── Section header ── */
  chapterLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: "#bbb",
    marginBottom: 6,
  },
  chapterTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: "#0a0a0a",
    marginBottom: 8,
  },
  accent: { width: 36, height: 2.5, marginBottom: 22 },
  bodyText: { fontSize: 10, lineHeight: 1.75, color: "#666", marginBottom: 22 },

  /* ── Quote ── */
  quoteWrap: {
    borderLeft: "3pt solid #0a0a0a",
    paddingLeft: 20,
    marginTop: 10,
    marginBottom: 30,
  },
  quoteText: {
    fontSize: 20,
    fontWeight: 400,
    color: "#111",
    fontStyle: "italic",
    lineHeight: 1.5,
  },

  /* ── Color swatch row ── */
  swatchBand: { height: 72, position: "relative" },
  swatchName: {
    position: "absolute",
    bottom: 10,
    left: 16,
    fontSize: 15,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  specRow: {
    flexDirection: "row",
    gap: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  specLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: "#bbb",
    letterSpacing: 1,
    marginBottom: 1,
  },
  specVal: { fontSize: 8.5, color: "#333" },

  /* ── Typography ── */
  typeRole: {
    fontSize: 8,
    fontWeight: 700,
    color: "#bbb",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  typeFamily: {
    fontSize: 36,
    fontWeight: 700,
    color: "#0a0a0a",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  typeAlphabet: { fontSize: 12, lineHeight: 1.9, color: "#555" },

  /* ── Logo ── */
  logoVariGrid: { flexDirection: "row", flexWrap: "wrap", gap: 22 },
  logoVariItem: {
    width: "46%",
    alignItems: "center",
    padding: 20,
    marginBottom: 14,
  },
  logoVariLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: "#aaa",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 12,
  },
  ruleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  ruleCard: {
    width: "48%",
    border: "1pt solid #eeeeee",
    padding: 14,
    minHeight: 66,
  },
  ruleTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#999999",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  ruleText: { fontSize: 9, lineHeight: 1.55, color: "#444444" },

  /* ── Footer (back cover) ── */
  footerBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: "#0a0a0a",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 65,
  },
  footerTxt: {
    fontSize: 6.5,
    color: "#666",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  /* ── Page number ── */
  pageNum: {
    position: "absolute",
    bottom: 22,
    right: 65,
    fontSize: 8,
    color: "#ccc",
  },
});

// ---------------------------------------------------------------------------
// Shared sub-components (outside render)
// ---------------------------------------------------------------------------
const Hairline = () => (
  <Svg height={1} width="100%">
    <Line x1="0" y1="0.5" x2="595" y2="0.5" strokeWidth={0.5} stroke="#eee" />
  </Svg>
);

const ChapterHead: React.FC<{
  label: string;
  title: string;
  accentColor: string;
  headingFontFamily: string;
}> = ({ label, title, accentColor, headingFontFamily }) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={s.chapterLabel}>{label}</Text>
    <Text style={[s.chapterTitle, { fontFamily: headingFontFamily }]}>
      {title}
    </Text>
    <View style={[s.accent, { backgroundColor: accentColor }]} />
  </View>
);

const Pg = () => (
  <Text
    style={s.pageNum}
    render={({ pageNumber }) => String(pageNumber).padStart(2, "0")}
    fixed
  />
);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
interface BrandGuidelinesPDFProps {
  data: BrandKitResultsData;
  embeddedFonts?: { heading: boolean; body: boolean };
}

export const BrandGuidelinesPDF: React.FC<BrandGuidelinesPDFProps> = ({
  data,
  embeddedFonts,
}) => {
  const guidelines = buildBrandGuidelinesViewModel(data);
  const brandName = guidelines?.brandName || data.brandName || "Brand Kit";
  const primaryLogo = guidelines?.primaryLogoUrl;
  const accent =
    guidelines && guidelines.colors.length > 0
      ? guidelines.colors[0].hex
      : "#0a0a0a";
  const headingFontFamily = embeddedFonts?.heading
    ? data.typography.heading.family
    : "Helvetica";
  const bodyFontFamily = embeddedFonts?.body
    ? data.typography.body.family
    : "Helvetica";

  if (!guidelines) {
    return (
      <Document>
        <Page
          size="A4"
          style={[s.page, s.content, { fontFamily: bodyFontFamily }]}
        >
          <ChapterHead
            label="Brand Guidelines"
            title="Document unavailable"
            accentColor={accent}
            headingFontFamily={headingFontFamily}
          />
          <Text style={s.bodyText}>
            Brand Guidelines were not selected for this Brand Kit.
          </Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      {/* ================================================================ */}
      {/* COVER                                                            */}
      {/* ================================================================ */}
      <Page size="A4" style={[s.page, { fontFamily: bodyFontFamily }]}>
        <View style={[s.coverAccentBar, { backgroundColor: accent }]} />
        <View style={s.coverInner}>
          {primaryLogo && (
            <Image
              src={primaryLogo}
              style={{ width: 150, objectFit: "contain", marginBottom: 45 }}
            />
          )}
          <Text
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: 1,
              marginBottom: 8,
              fontFamily: headingFontFamily,
            }}
          >
            {brandName}
          </Text>
          <Text
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 7,
              textTransform: "uppercase",
              color: "#666",
            }}
          >
            Brand Guidelines
          </Text>
          <Text
            style={{
              marginTop: 12,
              fontSize: 7,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#888888",
            }}
          >
            {guidelines.depth} edition
          </Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* 01 — BRAND DNA                                                   */}
      {/* ================================================================ */}
      {(guidelines.foundation.tagline ||
        guidelines.foundation.missionStatement) && (
        <Page
          size="A4"
          style={[s.page, s.content, { fontFamily: bodyFontFamily }]}
        >
          <ChapterHead
            label="01 — Brand DNA"
            title="Identity & Voice"
            accentColor={accent}
            headingFontFamily={headingFontFamily}
          />

          {guidelines.foundation.tagline && (
            <View style={s.quoteWrap}>
              <Text style={s.quoteText}>
                &ldquo;{guidelines.foundation.tagline}&rdquo;
              </Text>
            </View>
          )}

          {guidelines.foundation.missionStatement && (
            <Text style={s.bodyText}>
              {guidelines.foundation.missionStatement}
            </Text>
          )}
          <View style={s.ruleGrid}>
            {guidelines.foundation.industry && (
              <View style={s.ruleCard}>
                <Text style={s.ruleTitle}>Industry</Text>
                <Text style={s.ruleText}>{guidelines.foundation.industry}</Text>
              </View>
            )}
            {guidelines.foundation.targetAudience && (
              <View style={s.ruleCard}>
                <Text style={s.ruleTitle}>Audience</Text>
                <Text style={s.ruleText}>
                  {guidelines.foundation.targetAudience}
                </Text>
              </View>
            )}
            {guidelines.foundation.personality && (
              <View style={s.ruleCard}>
                <Text style={s.ruleTitle}>Personality</Text>
                <Text style={s.ruleText}>
                  {guidelines.foundation.personality}
                </Text>
              </View>
            )}
          </View>
          <Pg />
        </Page>
      )}

      {/* ================================================================ */}
      {/* 02 — LOGO SYSTEM                                                 */}
      {/* ================================================================ */}
      <Page
        size="A4"
        style={[s.page, s.content, { fontFamily: bodyFontFamily }]}
      >
        <ChapterHead
          label="02 — Logo System"
          title="Primary & Alternate Marks"
          accentColor={accent}
          headingFontFamily={headingFontFamily}
        />
        <Text style={s.bodyText}>
          The logo must remain unaltered at all times, maintaining its original
          proportions with adequate clear space surrounding it.
        </Text>

        {/* Primary Logo — clean, centered, generous whitespace */}
        {primaryLogo && (
          <View
            wrap={false}
            style={{
              alignItems: "center",
              paddingVertical: 40,
              marginBottom: 20,
            }}
          >
            <Image
              src={primaryLogo}
              style={{ width: "100%", maxWidth: 300, objectFit: "contain" }}
            />
          </View>
        )}

        {/* Variations */}
        {guidelines.logoVariations.length > 1 && (
          <View wrap={false}>
            <Text style={[s.chapterLabel, { marginBottom: 12 }]}>
              Alternate Marks
            </Text>
            <View style={s.logoVariGrid}>
              {guidelines.logoVariations.slice(1).map((v) => (
                <View key={v.id} style={s.logoVariItem}>
                  <Image
                    src={v.url}
                    style={{ width: "100%", height: 85, objectFit: "contain" }}
                  />
                  <Text style={s.logoVariLabel}>{v.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <Pg />
      </Page>

      <Page
        size="A4"
        style={[s.page, s.content, { fontFamily: bodyFontFamily }]}
      >
        <ChapterHead
          label="03 — Logo Standards"
          title="Usage Rules"
          accentColor={accent}
          headingFontFamily={headingFontFamily}
        />
        <Text style={s.bodyText}>
          Consistent spacing, scale, and treatment protect recognition across
          every application.
        </Text>
        <View style={[s.ruleGrid, { marginBottom: 22 }]}>
          <View style={s.ruleCard}>
            <Text style={s.ruleTitle}>Clear space</Text>
            <Text style={s.ruleText}>
              Keep at least {guidelines.logoRules.clearSpaceRatio * 100}% of the
              displayed logo height clear on every side.
            </Text>
          </View>
          <View style={s.ruleCard}>
            <Text style={s.ruleTitle}>Minimum digital width</Text>
            <Text style={s.ruleText}>
              {guidelines.logoRules.minimumDigitalWidth}px for the full logo;
              {` ${guidelines.logoRules.minimumMarkSize}px`} for the standalone
              mark. Treat these as recommended minimums.
            </Text>
          </View>
        </View>
        <Text style={[s.chapterLabel, { marginBottom: 12 }]}>
          Never do this
        </Text>
        <View style={s.ruleGrid}>
          {guidelines.logoRules.misuseRules.map((rule) => (
            <View key={rule} style={s.ruleCard}>
              <Text style={s.ruleText}>× {rule}</Text>
            </View>
          ))}
        </View>
        <Pg />
      </Page>

      {/* ================================================================ */}
      {/* 03 — COLOR PALETTE                                               */}
      {/* ================================================================ */}
      <Page
        size="A4"
        style={[s.page, s.content, { fontFamily: bodyFontFamily }]}
      >
        <ChapterHead
          label="04 — Color Palette"
          title="Brand Colors"
          accentColor={accent}
          headingFontFamily={headingFontFamily}
        />
        <Text style={s.bodyText}>
          Use HEX and RGB for digital work. CMYK values below are approximate;
          confirm production values with the printer and intended color profile.
        </Text>

        {guidelines.colors.map((color) => (
          <View
            key={`${color.role}-${color.hex}`}
            wrap={false}
            style={{ marginBottom: 4 }}
          >
            <View style={[s.swatchBand, { backgroundColor: color.hex }]}>
              <Text style={[s.swatchName, { color: color.preferredTextColor }]}>
                {color.role}
              </Text>
            </View>
            <View style={s.specRow}>
              <View>
                <Text style={s.specLabel}>HEX</Text>
                <Text style={s.specVal}>{color.hex.toUpperCase()}</Text>
              </View>
              <View>
                <Text style={s.specLabel}>RGB</Text>
                <Text style={s.specVal}>{color.rgb}</Text>
              </View>
              <View>
                <Text style={s.specLabel}>CMYK APPROX.</Text>
                <Text style={s.specVal}>{color.approximateCmyk}</Text>
              </View>
              <View>
                <Text style={s.specLabel}>TEXT CONTRAST</Text>
                <Text style={s.specVal}>
                  {color.contrastRatio.toFixed(2)}:1 with{" "}
                  {color.preferredTextColor}
                </Text>
              </View>
            </View>
            <Hairline />
          </View>
        ))}
        <Pg />
      </Page>

      {/* ================================================================ */}
      {/* 04 — TYPOGRAPHY                                                  */}
      {/* ================================================================ */}
      {(data.typography?.heading || data.typography?.body) && (
        <Page
          size="A4"
          style={[s.page, s.content, { fontFamily: bodyFontFamily }]}
        >
          <ChapterHead
            label="05 — Typography"
            title="Typefaces"
            accentColor={accent}
            headingFontFamily={headingFontFamily}
          />
          <Text style={s.bodyText}>
            These typefaces are mandatory for all brand communications across
            print and digital.
          </Text>

          {guidelines.typography.heading && (
            <View style={{ marginBottom: 40 }} wrap={false}>
              <Text style={s.typeRole}>Primary Typeface</Text>
              <Text
                style={[
                  s.typeFamily,
                  {
                    fontFamily: headingFontFamily,
                    fontWeight: getPdfFontWeight(
                      guidelines.typography.heading.weight,
                      700,
                    ),
                  },
                ]}
              >
                {guidelines.typography.heading.family}
              </Text>
              <View
                style={{
                  width: 40,
                  height: 2,
                  backgroundColor: accent,
                  marginBottom: 14,
                }}
              />
              <Text style={[s.typeAlphabet, { fontFamily: headingFontFamily }]}>
                A B C D E F G H I J K L M N O P Q R S T U V W X Y Z{"\n"}a b c d
                e f g h i j k l m n o p q r s t u v w x y z{"\n"}0 1 2 3 4 5 6 7
                8 9
              </Text>
            </View>
          )}

          {guidelines.typography.body && (
            <View style={{ marginBottom: 40 }} wrap={false}>
              <Text style={s.typeRole}>Secondary Typeface</Text>
              <Text
                style={[
                  s.typeFamily,
                  {
                    fontFamily: bodyFontFamily,
                    fontWeight: getPdfFontWeight(
                      guidelines.typography.body.weight,
                      400,
                    ),
                  },
                ]}
              >
                {guidelines.typography.body.family}
              </Text>
              <View
                style={{
                  width: 40,
                  height: 2,
                  backgroundColor: accent,
                  marginBottom: 14,
                }}
              />
              <Text style={[s.typeAlphabet, { fontFamily: bodyFontFamily }]}>
                A B C D E F G H I J K L M N O P Q R S T U V W X Y Z{"\n"}a b c d
                e f g h i j k l m n o p q r s t u v w x y z{"\n"}0 1 2 3 4 5 6 7
                8 9
              </Text>
            </View>
          )}
          <Pg />
        </Page>
      )}

      {guidelines.isComplete && guidelines.voice && (
        <Page
          size="A4"
          style={[s.page, s.content, { fontFamily: bodyFontFamily }]}
        >
          <ChapterHead
            label="06 — Verbal Identity"
            title="Voice & Tone"
            accentColor={accent}
            headingFontFamily={headingFontFamily}
          />
          <Text style={s.bodyText}>
            The brand should sound recognizably consistent while adapting its
            level of detail to the audience and channel.
          </Text>
          <Text style={[s.chapterLabel, { marginBottom: 12 }]}>
            Voice traits
          </Text>
          <View style={[s.ruleGrid, { marginBottom: 22 }]}>
            {guidelines.voice.traits.map((trait) => (
              <View key={trait} style={s.ruleCard}>
                <Text style={s.ruleText}>{trait}</Text>
              </View>
            ))}
          </View>
          <View style={s.ruleGrid}>
            <View style={s.ruleCard}>
              <Text style={s.ruleTitle}>Do</Text>
              {guidelines.voice.dos.map((item) => (
                <Text key={item} style={s.ruleText}>
                  • {item}
                </Text>
              ))}
            </View>
            <View style={s.ruleCard}>
              <Text style={s.ruleTitle}>Avoid</Text>
              {guidelines.voice.donts.map((item) => (
                <Text key={item} style={s.ruleText}>
                  • {item}
                </Text>
              ))}
            </View>
          </View>
          <Pg />
        </Page>
      )}

      {guidelines.isComplete && guidelines.applications.length > 0 && (
        <Page
          size="A4"
          style={[s.page, s.content, { fontFamily: bodyFontFamily }]}
        >
          <ChapterHead
            label="07 — Applications"
            title="Brand in Use"
            accentColor={accent}
            headingFontFamily={headingFontFamily}
          />
          <Text style={s.bodyText}>
            These generated touchpoints demonstrate how the identity system can
            remain coherent across channels.
          </Text>
          <View style={s.logoVariGrid}>
            {guidelines.applications.map((application) => (
              <View key={application.label} style={s.logoVariItem} wrap={false}>
                <Image
                  src={application.url}
                  style={{ width: "100%", height: 120, objectFit: "cover" }}
                />
                <Text style={s.logoVariLabel}>{application.label}</Text>
              </View>
            ))}
          </View>
          <Pg />
        </Page>
      )}

      {/* ================================================================ */}
      {/* BACK COVER                                                       */}
      {/* ================================================================ */}
      <Page size="A4" style={[s.page, { fontFamily: bodyFontFamily }]}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#0a0a0a",
          }}
        >
          {primaryLogo && (
            <Image
              src={primaryLogo}
              style={{
                width: 80,
                objectFit: "contain",
                opacity: 0.12,
                marginBottom: 18,
              }}
            />
          )}
          <Text
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 5,
              fontFamily: headingFontFamily,
              textTransform: "uppercase",
              color: "#555",
            }}
          >
            {brandName}
          </Text>
        </View>
        <View style={s.footerBar}>
          <Text style={s.footerTxt}>Brand Guidelines</Text>
          <Text style={s.footerTxt}>
            Generated by QuickLogo •{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
            })}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default BrandGuidelinesPDF;
