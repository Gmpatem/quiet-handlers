/**
 * Shared validation utilities for service forms
 * Used by Printing, GCash, and Delivery services
 */

export type ValidationResult = {
  isValid: boolean;
  error?: string;
};

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: any;
};

/**
 * Validate student/customer name
 */
export function validateName(name: string, minLength = 2): ValidationResult {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return { isValid: false, error: 'Please enter your name' };
  }
  
  if (trimmed.length < minLength) {
    return { isValid: false, error: `Name must be at least ${minLength} characters` };
  }
  
  return { isValid: true };
}

/**
 * Validate Philippine mobile number
 * Accepts formats: 09XX XXX XXXX, 09XXXXXXXXX, +639XXXXXXXXX
 */
export function validatePhilippineMobileNumber(contact: string): ValidationResult {
  const trimmed = contact.trim();
  
  if (!trimmed) {
    return { isValid: false, error: 'Please enter your contact number' };
  }
  
  const cleanContact = trimmed.replace(/\s/g, '');
  const contactRegex = /^(09|\+639)\d{9}$/;
  
  if (!contactRegex.test(cleanContact)) {
    return { 
      isValid: false, 
      error: 'Please enter a valid Philippine mobile number (09XX XXX XXXX)' 
    };
  }
  
  return { isValid: true };
}

/**
 * Validate item description (for delivery orders)
 */
export function validateItemDescription(description: string, minLength = 10): ValidationResult {
  const trimmed = description.trim();
  
  if (!trimmed) {
    return { isValid: false, error: 'Please describe what you want to buy' };
  }
  
  if (trimmed.length < minLength) {
    return { 
      isValid: false, 
      error: `Please provide more details (at least ${minLength} characters)` 
    };
  }
  
  return { isValid: true };
}

/**
 * Validate transaction amount
 */
export function validateAmount(
  amount: number, 
  minAmount: number = 1, 
  maxAmount: number = 100000
): ValidationResult {
  if (isNaN(amount) || amount <= 0) {
    return { isValid: false, error: 'Please enter a valid amount' };
  }
  
  if (amount < minAmount) {
    return { isValid: false, error: `Minimum amount is ₱${minAmount}` };
  }
  
  if (amount > maxAmount) {
    return { isValid: false, error: `Maximum amount is ₱${maxAmount.toLocaleString()}` };
  }
  
  return { isValid: true };
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File | null,
  options: {
    required?: boolean;
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}
): ValidationResult {
  const { required = false, maxSizeMB = 5, allowedTypes } = options;
  
  if (!file) {
    if (required) {
      return { isValid: false, error: 'Please upload a file' };
    }
    return { isValid: true };
  }
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { isValid: false, error: `File must be under ${maxSizeMB}MB` };
  }
  
  // Check file type
  if (allowedTypes && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('/*', ''));
      }
      return file.type === type;
    });
    
    if (!isAllowed) {
      return { 
        isValid: false, 
        error: `Only ${allowedTypes.join(', ')} files are allowed` 
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Validate image file
 */
export function validateImageFile(
  file: File | null,
  required = false,
  maxSizeMB = 5
): ValidationResult {
  return validateFileUpload(file, {
    required,
    maxSizeMB,
    allowedTypes: ['image/*']
  });
}

/**
 * Validate PDF file
 */
export function validatePdfFile(
  file: File | null,
  required = false,
  maxSizeMB = 100
): ValidationResult {
  return validateFileUpload(file, {
    required,
    maxSizeMB,
    allowedTypes: ['application/pdf']
  });
}

// ============================================
// Delivery Service Validation
// ============================================

export type DeliveryValidationData = {
  studentName: string;
  studentContact: string;
  itemDescription: string;
  deliveryFee: number;
};

/**
 * Validate delivery form data
 */
export function validateDeliveryData(
  studentName: string,
  studentContact: string,
  itemDescription: string,
  deliveryFee: number
): ActionResult {
  // Validate student name
  const nameResult = validateName(studentName);
  if (!nameResult.isValid) {
    return { success: false, error: nameResult.error };
  }

  // Validate contact number
  const contactResult = validatePhilippineMobileNumber(studentContact);
  if (!contactResult.isValid) {
    return { success: false, error: contactResult.error };
  }

  // Validate item description
  const descResult = validateItemDescription(itemDescription);
  if (!descResult.isValid) {
    return { success: false, error: descResult.error };
  }

  // Validate delivery fee
  if (deliveryFee < 0) {
    return { success: false, error: 'Invalid delivery fee' };
  }

  return { success: true };
}

// ============================================
// GCash Service Validation
// ============================================

export type GCashTransactionType = 'cash_in' | 'cash_out';

export type GCashValidationData = {
  transactionType: GCashTransactionType;
  amount: number;
  serviceFee: number;
  totalAmount: number;
};

/**
 * Calculate GCash service fee (2% for all types)
 */
export function calculateGCashFee(transactionType: GCashTransactionType, amount: number): number {
  // Fee structure: 2% for all transaction types
  const feeRates: Record<GCashTransactionType, number> = {
    cash_in: 0.02,   // 2% fee
    cash_out: 0.02   // 2% fee
  };

  const rate = feeRates[transactionType] || 0.02;
  return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Validate GCash transaction data
 */
export function validateGCashData(
  transactionType: GCashTransactionType,
  amount: number,
  serviceFee: number,
  totalAmount: number
): ActionResult {
  // Validate amount
  if (amount <= 0) {
    return { success: false, error: 'Amount must be greater than 0' };
  }

  // Validate minimum/maximum amounts
  const limits: Record<GCashTransactionType, { min: number; max: number }> = {
    cash_in: { min: 100, max: 50000 },
    cash_out: { min: 100, max: 50000 }
  };

  const limit = limits[transactionType];
  if (amount < limit.min) {
    return { 
      success: false, 
      error: `Minimum amount is ₱${limit.min}` 
    };
  }

  if (amount > limit.max) {
    return { 
      success: false, 
      error: `Maximum amount is ₱${limit.max.toLocaleString()}` 
    };
  }

  // Validate service fee calculation
  const expectedFee = calculateGCashFee(transactionType, amount);
  if (Math.abs(serviceFee - expectedFee) > 0.01) {
    return { 
      success: false, 
      error: 'Invalid service fee calculation' 
    };
  }

  // Validate total amount
  const expectedTotal = amount + serviceFee;
  if (Math.abs(totalAmount - expectedTotal) > 0.01) {
    return { 
      success: false, 
      error: 'Invalid total amount calculation' 
    };
  }

  return { success: true };
}
