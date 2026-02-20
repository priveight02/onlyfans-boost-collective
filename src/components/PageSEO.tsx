import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface PageSEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  jsonLd?: object;
}

const BASE_URL = "https://uplyze.ai";

const PageSEO = ({ title, description, canonical, ogTitle, ogDescription, ogImage, jsonLd }: PageSEOProps) => {
  const location = useLocation();
  const fullCanonical = canonical || `${BASE_URL}${location.pathname === "/" ? "" : location.pathname}`;

  useEffect(() => {
    // Title
    document.title = title;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", description);

    // Canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (link) link.href = fullCanonical;

    // OG tags
    const setOG = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (tag) tag.setAttribute("content", content);
    };
    setOG("og:title", ogTitle || title);
    setOG("og:description", ogDescription || description);
    setOG("og:url", fullCanonical);
    if (ogImage) setOG("og:image", ogImage);

    // Twitter
    const setTwitter = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (tag) tag.setAttribute("content", content);
    };
    setTwitter("twitter:title", ogTitle || title);
    setTwitter("twitter:description", ogDescription || description);

    // JSON-LD
    if (jsonLd) {
      let script = document.getElementById("page-jsonld");
      if (!script) {
        script = document.createElement("script");
        script.id = "page-jsonld";
        script.setAttribute("type", "application/ld+json");
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      const script = document.getElementById("page-jsonld");
      if (script) script.remove();
    };
  }, [title, description, fullCanonical, ogTitle, ogDescription, ogImage, jsonLd]);

  return null;
};

export default PageSEO;
