import type { Klass, LexicalNode, LexicalNodeReplacement} from 'lexical';
import { ParagraphNode, TextNode } from 'lexical'
import { HeadingNode, QuoteNode } from "@lexical/rich-text"

export const nodes: readonly (Klass<LexicalNode> | LexicalNodeReplacement)[] =
  [
    HeadingNode,
    ParagraphNode,
    TextNode,
    QuoteNode,
  ]
