import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.TOOL_ENDPOINT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "url is required and must be a string" },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Only http and https URLs are supported" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SubconsciousBot/1.0; +https://subconscious.dev)",
        Accept: "text/html,application/xhtml+xml,text/plain,*/*",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({
        error: `Failed to fetch URL: HTTP ${response.status} ${response.statusText}`,
      });
    }

    const contentType = response.headers.get("content-type") || "";
    const html = await response.text();

    let title = "";
    let content = html;

    if (contentType.includes("text/html") || contentType.includes("xhtml")) {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";

      content = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[\s\S]*?<\/nav>/gi, "")
        .replace(/<header[\s\S]*?<\/header>/gi, "")
        .replace(/<footer[\s\S]*?<\/footer>/gi, "")
        .replace(/<aside[\s\S]*?<\/aside>/gi, "")
        .replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote|pre|hr)[^>]*>/gi, "\n")
        .replace(/<li[^>]*>/gi, "\n- ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, "/")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n/g, "\n\n")
        .trim();
    }

    const maxLength = 12000;
    const truncated = content.length > maxLength;
    const finalContent = truncated
      ? content.slice(0, maxLength) + "\n\n[Content truncated...]"
      : content;

    return NextResponse.json({
      success: true,
      url,
      title,
      content: finalContent,
      contentLength: content.length,
      truncated,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({
        error: "Request timed out after 15 seconds",
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch URL" },
      { status: 500 }
    );
  }
}
