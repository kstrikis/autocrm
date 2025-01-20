export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce logging practices',
      category: 'Best Practices',
      recommended: true
    },
    schema: [{
      type: 'object',
      properties: {
        excludeSmallFunctions: { type: 'boolean' },
        smallFunctionThreshold: { type: 'number' },
        excludePatterns: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      additionalProperties: false
    }]
  },
  create(context) {
    const options = context.options[0] || {};
    const excludeSmallFunctions = options.excludeSmallFunctions || false;
    const smallFunctionThreshold = options.smallFunctionThreshold || 3;
    const excludePatterns = options.excludePatterns || [];
    const excludeRegexps = excludePatterns.map(pattern => new RegExp(pattern));

    function shouldExcludeFunction(node) {
      const functionName = node.id ? node.id.name : 'anonymous';
      
      // Check if function name matches any exclude pattern
      if (excludeRegexps.some(regex => regex.test(functionName))) {
        return true;
      }

      // Check if function is small enough to exclude
      if (excludeSmallFunctions && node.body.body && node.body.body.length <= smallFunctionThreshold) {
        return true;
      }

      return false;
    }

    return {
      FunctionDeclaration(node) {
        if (!shouldExcludeFunction(node)) {
          checkFunction(node, context);
        }
      },
      FunctionExpression(node) {
        if (!shouldExcludeFunction(node)) {
          checkFunction(node, context);
        }
      },
      ArrowFunctionExpression(node) {
        if (!shouldExcludeFunction(node)) {
          checkFunction(node, context);
        }
      },
      CatchClause(node) {
        checkCatchBlock(node, context);
      }
    };
  }
};

function checkFunction(node, context) {
  const functionName = node.id ? node.id.name : 'anonymous';
  let hasLogging = false;
  let hasEntryLogging = false;
  let hasExitLogging = false;

  // Check for logging statements
  const body = node.body.body || [];
  for (const statement of body) {
    if (isLoggingStatement(statement)) {
      hasLogging = true;
      if (isEntryLogging(statement)) {
        hasEntryLogging = true;
      }
      if (isExitLogging(statement)) {
        hasExitLogging = true;
      }
    }
  }

  if (!hasLogging) {
    context.report({
      node,
      message: `Function ${functionName} should have at least one logging statement`
    });
  }

  if (!hasEntryLogging) {
    context.report({
      node,
      message: `Function ${functionName} should log its entry point using logger.methodEntry`
    });
  }

  if (!hasExitLogging) {
    context.report({
      node,
      message: `Function ${functionName} should log its exit point using logger.methodExit`
    });
  }
}

function checkCatchBlock(node, context) {
  let hasErrorLogging = false;

  // Check for error logging in catch block
  const body = node.body.body || [];
  for (const statement of body) {
    if (isErrorLogging(statement)) {
      hasErrorLogging = true;
      break;
    }
  }

  if (!hasErrorLogging) {
    context.report({
      node,
      message: 'Catch block should use logger.error for error handling'
    });
  }
}

function isLoggingStatement(node) {
  return (
    node.type === 'ExpressionStatement' &&
    node.expression.type === 'CallExpression' &&
    node.expression.callee.type === 'MemberExpression' &&
    node.expression.callee.object.type === 'Identifier' &&
    node.expression.callee.object.name === 'logger' &&
    /^(methodEntry|methodExit|info|debug|warn|error)$/.test(node.expression.callee.property.name)
  );
}

function isEntryLogging(node) {
  return (
    node.type === 'ExpressionStatement' &&
    node.expression.type === 'CallExpression' &&
    node.expression.callee.type === 'MemberExpression' &&
    node.expression.callee.object.type === 'Identifier' &&
    node.expression.callee.object.name === 'logger' &&
    node.expression.callee.property.name === 'methodEntry'
  );
}

function isExitLogging(node) {
  return (
    node.type === 'ExpressionStatement' &&
    node.expression.type === 'CallExpression' &&
    node.expression.callee.type === 'MemberExpression' &&
    node.expression.callee.object.type === 'Identifier' &&
    node.expression.callee.object.name === 'logger' &&
    node.expression.callee.property.name === 'methodExit'
  );
}

function isErrorLogging(node) {
  return (
    node.type === 'ExpressionStatement' &&
    node.expression.type === 'CallExpression' &&
    node.expression.callee.type === 'MemberExpression' &&
    node.expression.callee.object.type === 'Identifier' &&
    node.expression.callee.object.name === 'logger' &&
    node.expression.callee.property.name === 'error'
  );
} 