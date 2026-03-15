import { TextChunk } from './types.js';
import { config } from './config.js';

const SENTENCE_ENDINGS = /[.!?]+[\s\n]+/;
const PARAGRAPH_BREAKS = /\n\s*\n/;
const PHRASE_BREAKS = /[,;:]+[\s\n]+/;

export class TextChunker {
  private maxChunkSize: number;
  private minChunkSize: number;

  constructor() {
    this.maxChunkSize = config.chunking.maxChunkSize;
    this.minChunkSize = config.chunking.minChunkSize;
  }

  chunk(text: string): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const cleanedText = this.cleanText(text);
    if (cleanedText.length <= this.maxChunkSize) {
      return [{
        text: cleanedText,
        index: 0,
        startChar: 0,
        endChar: cleanedText.length,
      }];
    }

    return this.splitIntoChunks(cleanedText);
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  private splitIntoChunks(text: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    let currentIndex = 0;
    let chunkIndex = 0;

    const paragraphs = text.split(PARAGRAPH_BREAKS);

    for (const paragraph of paragraphs) {
      if (paragraph.trim().length === 0) continue;

      if (paragraph.length <= this.maxChunkSize) {
        if (this.canAddToChunk(chunks, paragraph)) {
          const lastChunk = chunks[chunks.length - 1];
          lastChunk.text += '\n\n' + paragraph;
          lastChunk.endChar += 2 + paragraph.length;
        } else {
          chunks.push({
            text: paragraph,
            index: chunkIndex++,
            startChar: currentIndex,
            endChar: currentIndex + paragraph.length,
          });
        }
      } else {
        const paragraphChunks = this.splitLongParagraph(paragraph, currentIndex, chunkIndex);
        chunks.push(...paragraphChunks);
        chunkIndex = paragraphChunks.length > 0 
          ? paragraphChunks[paragraphChunks.length - 1].index + 1 
          : chunkIndex;
      }

      currentIndex += paragraph.length + 2;
    }

    return chunks.map((chunk, idx) => ({ ...chunk, index: idx }));
  }

  private canAddToChunk(chunks: TextChunk[], nextText: string): boolean {
    if (chunks.length === 0) return false;
    const lastChunk = chunks[chunks.length - 1];
    return lastChunk.text.length + nextText.length + 2 <= this.maxChunkSize;
  }

  private splitLongParagraph(
    paragraph: string,
    startOffset: number,
    startIndex: number
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    let currentPos = 0;
    let chunkIndex = startIndex;

    while (currentPos < paragraph.length) {
      const remainingText = paragraph.slice(currentPos);
      
      if (remainingText.length <= this.maxChunkSize) {
        chunks.push({
          text: remainingText.trim(),
          index: chunkIndex++,
          startChar: startOffset + currentPos,
          endChar: startOffset + currentPos + remainingText.length,
        });
        break;
      }

      const chunk = this.findBestSplitPoint(remainingText, this.maxChunkSize);
      
      if (chunk.size > this.minChunkSize || chunks.length === 0) {
        chunks.push({
          text: chunk.text.trim(),
          index: chunkIndex++,
          startChar: startOffset + currentPos,
          endChar: startOffset + currentPos + chunk.size,
        });
        currentPos += chunk.size;
      } else {
        chunks.push({
          text: remainingText.slice(0, this.maxChunkSize).trim(),
          index: chunkIndex++,
          startChar: startOffset + currentPos,
          endChar: startOffset + currentPos + this.maxChunkSize,
        });
        currentPos += this.maxChunkSize;
      }
    }

    return chunks;
  }

  private findBestSplitPoint(text: string, maxSize: number): { text: string; size: number } {
    const searchText = text.slice(0, maxSize);
    
    const sentenceMatch = searchText.match(SENTENCE_ENDINGS);
    if (sentenceMatch && sentenceMatch.index !== undefined) {
      const splitPos = sentenceMatch.index + sentenceMatch[0].length;
      if (splitPos >= this.minChunkSize) {
        return { text: text.slice(0, splitPos), size: splitPos };
      }
    }

    const phraseMatch = searchText.match(PHRASE_BREAKS);
    if (phraseMatch && phraseMatch.index !== undefined) {
      const splitPos = phraseMatch.index + phraseMatch[0].length;
      if (splitPos >= this.minChunkSize) {
        return { text: text.slice(0, splitPos), size: splitPos };
      }
    }

    const lastSpace = searchText.lastIndexOf(' ');
    if (lastSpace > this.minChunkSize) {
      return { text: text.slice(0, lastSpace), size: lastSpace };
    }

    return { text: text.slice(0, maxSize), size: maxSize };
  }
}

export const chunker = new TextChunker();
