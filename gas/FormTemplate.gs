/**
 * PE Portal - Form Template Management
 * Handles Google Forms creation and management
 * 
 * @author h-watanabe
 * @version 1.0
 * @created 2025-10-27
 */

/**
 * Create a Google Form based on template data
 * @param {Object} formData - Form configuration
 * @return {GoogleAppsScript.Forms.Form} Created form
 */
function createForm(formData) {
  console.log('Creating form with data:', formData);
  
  try {
    // Create new form
    const form = FormApp.create(formData.title);
    
    // Set form description
    if (formData.description) {
      form.setDescription(formData.description);
    }
    
    // Set form settings
    form.setCollectEmail(true);
    form.setRequireLogin(true);
    form.setAllowResponseEdits(false);
    form.setShowLinkToRespondAgain(false);
    
    // Add questions based on template
    if (formData.questions && formData.questions.length > 0) {
      formData.questions.forEach(questionData => {
        addQuestionToForm(form, questionData);
      });
    }
    
    // Move form to designated folder
    const config = getConfig();
    if (config.folders.formsFolderId) {
      moveFormToFolder(form.getId(), config.folders.formsFolderId);
    }
    
    console.log('Form created successfully:', form.getId());
    return form;
  } catch (error) {
    console.error('Form creation failed:', error);
    throw error;
  }
}

/**
 * Add a question to the form
 * @param {GoogleAppsScript.Forms.Form} form - Form object
 * @param {Object} questionData - Question configuration
 */
function addQuestionToForm(form, questionData) {
  console.log('Adding question:', questionData);
  
  let item;
  
  switch (questionData.type) {
    case 'text':
      item = form.addTextItem();
      break;
    case 'paragraph':
      item = form.addParagraphTextItem();
      break;
    case 'multiple_choice':
      item = form.addMultipleChoiceItem();
      if (questionData.options) {
        questionData.options.forEach(option => {
          item.createChoice(option);
        });
      }
      break;
    case 'checkbox':
      item = form.addCheckboxItem();
      if (questionData.options) {
        questionData.options.forEach(option => {
          item.createChoice(option);
        });
      }
      break;
    case 'dropdown':
      item = form.addListItem();
      if (questionData.options) {
        questionData.options.forEach(option => {
          item.createChoice(option);
        });
      }
      break;
    case 'scale':
      item = form.addScaleItem();
      if (questionData.min && questionData.max) {
        item.setBounds(questionData.min, questionData.max);
      }
      break;
    case 'date':
      item = form.addDateItem();
      break;
    case 'time':
      item = form.addTimeItem();
      break;
    case 'datetime':
      item = form.addDateTimeItem();
      break;
    default:
      console.warn('Unknown question type:', questionData.type);
      return;
  }
  
  // Set question properties
  if (item) {
    item.setTitle(questionData.title);
    
    if (questionData.description) {
      item.setHelpText(questionData.description);
    }
    
    if (questionData.required) {
      item.setRequired(true);
    }
  }
}

/**
 * Move form to specified folder
 * @param {string} formId - Form ID
 * @param {string} folderId - Target folder ID
 */
function moveFormToFolder(formId, folderId) {
  try {
    const file = DriveApp.getFileById(formId);
    const targetFolder = DriveApp.getFolderById(folderId);
    
    // Remove from current location
    const parents = file.getParents();
    while (parents.hasNext()) {
      parents.next().removeFile(file);
    }
    
    // Add to target folder
    targetFolder.addFile(file);
    
    console.log('Form moved to folder:', folderId);
  } catch (error) {
    console.error('Failed to move form to folder:', error);
    throw error;
  }
}

/**
 * Get form template for request management
 * @return {Object} Form template configuration
 */
function getRequestFormTemplate() {
  return {
    title: 'PE Portal - System Request Form',
    description: 'Please fill out this form to submit your system request. All fields marked with * are required.',
    questions: [
      {
        type: 'text',
        title: 'Request Title *',
        description: 'Brief title describing your request',
        required: true
      },
      {
        type: 'paragraph',
        title: 'Request Description *',
        description: 'Detailed description of your request',
        required: true
      },
      {
        type: 'multiple_choice',
        title: 'Priority Level *',
        description: 'Select the priority level for this request',
        options: ['Low', 'Medium', 'High', 'Critical'],
        required: true
      },
      {
        type: 'multiple_choice',
        title: 'Request Type *',
        description: 'Select the type of request',
        options: [
          'New System Development',
          'System Enhancement',
          'Bug Fix',
          'Data Analysis',
          'Report Generation',
          'Other'
        ],
        required: true
      },
      {
        type: 'date',
        title: 'Desired Completion Date',
        description: 'When would you like this request to be completed?',
        required: false
      },
      {
        type: 'paragraph',
        title: 'Additional Information',
        description: 'Any additional information that might be helpful',
        required: false
      }
    ]
  };
}

/**
 * Create a standard request form
 * @return {Object} Result object with form URL and ID
 */
function createStandardRequestForm() {
  const template = getRequestFormTemplate();
  return createForm(template);
}

/**
 * Update form settings
 * @param {string} formId - Form ID
 * @param {Object} settings - Settings to update
 */
function updateFormSettings(formId, settings) {
  try {
    const form = FormApp.openById(formId);
    
    if (settings.title) {
      form.setTitle(settings.title);
    }
    
    if (settings.description) {
      form.setDescription(settings.description);
    }
    
    if (settings.collectEmail !== undefined) {
      form.setCollectEmail(settings.collectEmail);
    }
    
    if (settings.requireLogin !== undefined) {
      form.setRequireLogin(settings.requireLogin);
    }
    
    console.log('Form settings updated:', formId);
  } catch (error) {
    console.error('Failed to update form settings:', error);
    throw error;
  }
}

/**
 * Get form responses summary
 * @param {string} formId - Form ID
 * @return {Object} Form responses summary
 */
function getFormResponsesSummary(formId) {
  try {
    const form = FormApp.openById(formId);
    const responses = form.getResponses();
    
    return {
      formId: formId,
      totalResponses: responses.length,
      lastResponse: responses.length > 0 ? responses[responses.length - 1].getTimestamp() : null,
      formUrl: form.getPublishedUrl(),
      editUrl: form.getEditUrl()
    };
  } catch (error) {
    console.error('Failed to get form responses summary:', error);
    throw error;
  }
}
