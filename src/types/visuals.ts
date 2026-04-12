export type VisualActionType = 'expand' | 'move' | 'highlight' | 'fade_out' | 'fade_in' | 'cancel' | 'answer';

export type VisualLine = 'current' | 'next' | 'previous';

export type AnchorRole =
  | 'equation_center'
  | 'left_side'
  | 'right_side'
  | 'answer_term'
  | 'distributor'
  | 'expanded_left_term'
  | 'expanded_right_term'
  | 'moving_term'
  | 'result_term_slot';

export type AnchorRef = {
  line?: VisualLine;
  role: AnchorRole;
};

export type FormulaToken = {
  id: string;
  role?: string;
  text: string;
};

export type TokenRef = {
  line?: VisualLine;
  role?: string;
  tokenId?: string;
};

export type VisualRef = {
  line?: VisualLine;
  role?: string;
  tokenId?: string;
};

export type PositionRef = AnchorRef | TokenRef;

export type AlgebraVisualAction =
  | {
      source?: PositionRef;
      target?: string;
      targets?: {
        left: PositionRef;
        right: PositionRef;
      };
      type: 'expand';
    }
  | {
      result?: string;
      resultLatex?: string;
      source?: PositionRef;
      target?: PositionRef;
      targetAnchor?: AnchorRef;
      targetSide?: 'left' | 'right';
      term: string;
      type: 'move';
    }
  | {
      anchor?: PositionRef;
      target?: string;
      term?: string;
      type: 'highlight';
    }
  | {
      anchor?: PositionRef;
      target?: string;
      term?: string;
      type: 'fade_out';
    }
  | {
      anchor?: PositionRef;
      expression?: string;
      target?: string;
      type: 'fade_in';
    }
  | {
      anchor?: PositionRef;
      term: string;
      type: 'cancel';
    }
  | {
      expression?: string;
      target?: string;
      type: 'answer';
    };
