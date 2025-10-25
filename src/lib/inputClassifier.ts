export type InputCategory = 'todo' | 'budget' | 'unknown';

interface ClassificationResult {
  category: InputCategory;
  confidence: number;
  extractedData?: {
    title?: string;
    amount?: number;
    type?: 'income' | 'expense';
    priority?: 'low' | 'medium' | 'high';
    description?: string;
    budgetCategory?: string;
  };
}

class InputClassifier {
  private todoKeywords = [
    'task', 'todo', 'remind', 'meeting', 'appointment', 'call', 'visit',
    'deadline', 'schedule', 'plan', 'do', 'complete', 'finish', 'work',
    'project', 'assignment', 'homework', 'study', 'read', 'write', 'email',
    'buy', 'shopping', 'groceries', 'pickup', 'drop', 'submit', 'review'
  ];

  private budgetKeywords = [
    'spend', 'spent', 'buy', 'bought', 'cost', 'price', 'pay', 'paid',
    'income', 'earn', 'earned', 'salary', 'money', 'cash', 'dollar', 'dollars',
    'expense', 'bill', 'rent', 'utilities', 'food', 'gas', 'fuel',
    'subscription', 'payment', 'purchase', 'transaction', 'budget',
    'investment', 'save', 'saving', 'deposit', 'withdraw', 'transfer'
  ];

  private priorityKeywords = {
    high: ['urgent', 'important', 'asap', 'critical', 'priority', 'rush', 'immediately'],
    medium: ['soon', 'moderate', 'normal', 'regular'],
    low: ['later', 'sometime', 'eventually', 'whenever', 'low priority']
  };

  private incomeKeywords = [
    'earn', 'earned', 'salary', 'income', 'bonus', 'profit', 'revenue',
    'payment received', 'deposit', 'refund', 'cashback', 'dividend'
  ];

  private expenseKeywords = [
    'spend', 'spent', 'buy', 'bought', 'cost', 'pay', 'paid', 'bill',
    'expense', 'purchase', 'fee', 'charge', 'subscription', 'rent'
  ];

  private budgetCategories = {
    food: ['food', 'eat', 'meal', 'lunch', 'dinner', 'breakfast', 'restaurant', 'cafe', 'pizza', 'burger', 'sandwich', 'cooking', 'kitchen'],
    groceries: ['groceries', 'grocery', 'supermarket', 'vegetables', 'fruits', 'milk', 'bread', 'shopping', 'mart', 'store'],
    snack: ['snack', 'snacks', 'chips', 'chocolate', 'candy', 'cookies', 'ice cream', 'soda', 'juice', 'coffee', 'tea'],
    rent: ['rent', 'housing', 'apartment', 'house', 'mortgage', 'lease', 'accommodation', 'property'],
    fees: ['fees', 'fee', 'tuition', 'school', 'college', 'university', 'course', 'class', 'education', 'registration'],
    stationary: ['stationary', 'stationery', 'pen', 'pencil', 'paper', 'notebook', 'books', 'supplies', 'office'],
    transport: ['transport', 'transportation', 'gas', 'fuel', 'petrol', 'uber', 'taxi', 'bus', 'train', 'metro', 'parking'],
    utilities: ['utilities', 'electricity', 'water', 'internet', 'phone', 'mobile', 'wifi', 'heating', 'gas bill'],
    entertainment: ['entertainment', 'movie', 'cinema', 'games', 'gaming', 'music', 'spotify', 'netflix', 'streaming'],
    health: ['health', 'medical', 'doctor', 'medicine', 'pharmacy', 'hospital', 'dental', 'fitness', 'gym'],
    shopping: ['shopping', 'clothes', 'clothing', 'shoes', 'accessories', 'electronics', 'gadgets', 'amazon'],
    other: ['other', 'miscellaneous', 'misc', 'various']
  };

  classify(input: string): ClassificationResult {
    const lowerInput = input.toLowerCase();
    const words = lowerInput.split(/\s+/);

    let todoScore = 0;
    let budgetScore = 0;

    // Calculate scores based on keyword matches
    words.forEach(word => {
      if (this.todoKeywords.includes(word)) {
        todoScore += 1;
      }
      if (this.budgetKeywords.includes(word)) {
        budgetScore += 1;
      }
    });

    // Check for specific patterns
    const hasAmount = /\$?\d+(\.\d{2})?|\d+\s*(dollars?|bucks?|cents?)/.test(lowerInput);
    if (hasAmount) {
      budgetScore += 2;
    }

    // Check for date/time patterns that might indicate todos
    const hasDateTime = /(today|tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2}|am|pm)/i.test(input);
    if (hasDateTime && !hasAmount) {
      todoScore += 1;
    }

    // Determine category
    let category: InputCategory = 'unknown';
    let confidence = 0;

    if (budgetScore > todoScore) {
      category = 'budget';
      confidence = Math.min(budgetScore / (todoScore + budgetScore + 1), 0.95);
    } else if (todoScore > budgetScore) {
      category = 'todo';
      confidence = Math.min(todoScore / (todoScore + budgetScore + 1), 0.95);
    } else if (todoScore === budgetScore && todoScore > 0) {
      // If equal scores, prefer the one with stronger context
      if (hasAmount) {
        category = 'budget';
        confidence = 0.6;
      } else if (hasDateTime) {
        category = 'todo';
        confidence = 0.6;
      }
    }

    // Extract relevant data
    const extractedData = this.extractData(input, category);

    return {
      category,
      confidence,
      extractedData
    };
  }

  private extractData(input: string, category: InputCategory) {
    const lowerInput = input.toLowerCase();
    const extractedData: any = {};

    if (category === 'budget') {
      // Extract amount
      const amountMatch = input.match(/\$?(\d+(?:\.\d{2})?)/);
      if (amountMatch) {
        extractedData.amount = parseFloat(amountMatch[1]);
      }

      // Determine if income or expense
      const hasIncomeKeyword = this.incomeKeywords.some(keyword => lowerInput.includes(keyword));
      const hasExpenseKeyword = this.expenseKeywords.some(keyword => lowerInput.includes(keyword));
      
      if (hasIncomeKeyword && !hasExpenseKeyword) {
        extractedData.type = 'income';
      } else {
        extractedData.type = 'expense'; // Default to expense
      }

      // Extract budget category
      extractedData.budgetCategory = this.extractBudgetCategory(lowerInput);

      // Extract reason (clean up the input)
      let reason = input.replace(/\$?\d+(?:\.\d{2})?/, '').trim();
      reason = reason.replace(/^(spend|spent|buy|bought|pay|paid|earn|earned)\s*/i, '').trim();
      if (reason) {
        extractedData.description = reason;
      }
    }

    if (category === 'todo') {
      // Extract priority
      for (const [priority, keywords] of Object.entries(this.priorityKeywords)) {
        if (keywords.some(keyword => lowerInput.includes(keyword))) {
          extractedData.priority = priority;
          break;
        }
      }

      // Default priority if not specified
      if (!extractedData.priority) {
        extractedData.priority = 'medium';
      }

      // Extract title (use the whole input as title, cleaned up)
      let title = input.replace(/(urgent|important|asap|critical|priority|rush|immediately|soon|later|sometime|eventually)/gi, '').trim();
      if (title) {
        extractedData.title = title;
      }

      extractedData.description = '';
    }

    return extractedData;
  }

  private extractBudgetCategory(input: string): string {
    const words = input.split(/\s+/);
    
    // Check each category for keyword matches
    for (const [category, keywords] of Object.entries(this.budgetCategories)) {
      for (const keyword of keywords) {
        if (words.some(word => word.includes(keyword) || keyword.includes(word))) {
          return category;
        }
      }
    }
    
    return 'other'; // Default category
  }
}

export const inputClassifier = new InputClassifier();