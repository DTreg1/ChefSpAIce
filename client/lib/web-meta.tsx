import { useEffect } from "react";
import { Platform } from "react-native";

export interface PageMeta {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogType?: string;
  ogImage?: string;
}

function setMetaTag(
  name: string,
  content: string,
  isProperty: boolean = false
): void {
  const attribute = isProperty ? "property" : "name";
  let element = document.querySelector(`meta[${attribute}="${name}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

export function usePageMeta(meta: PageMeta): void {
  useEffect(() => {
    if (Platform.OS === "web") {
      document.title = meta.title;

      setMetaTag("description", meta.description);

      if (meta.ogTitle) {
        setMetaTag("og:title", meta.ogTitle, true);
      }

      if (meta.ogDescription) {
        setMetaTag("og:description", meta.ogDescription, true);
      }

      if (meta.ogUrl) {
        setMetaTag("og:url", meta.ogUrl, true);
      }

      if (meta.ogType) {
        setMetaTag("og:type", meta.ogType, true);
      }

      if (meta.ogImage) {
        setMetaTag("og:image", meta.ogImage, true);
      }
    }
  }, [meta]);
}
