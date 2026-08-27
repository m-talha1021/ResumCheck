declare module "pdfjs-dist/build/pdf.mjs" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(src: { data: ArrayBuffer }): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{
        getTextContent(): Promise<{ items: { str?: string }[] }>;
      }>;
    }>;
  };
}

declare module "mammoth/mammoth.browser" {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
}
