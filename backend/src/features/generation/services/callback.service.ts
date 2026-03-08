import { Injectable, Logger, BadRequestException } from '@nestjs/common';

@Injectable()
export class CallbackService {
  private readonly logger = new Logger(CallbackService.name);

  /**
   * Build a lookup context from previously generated component data.
   * Keys are component IDs or component types.
   */
  buildCallbackContext(
    generatedComponents: Map<string, Record<string, any>>,
  ): Record<string, any> {
    const context: Record<string, any> = {};
    for (const [key, data] of generatedComponents) {
      context[key] = data;
    }
    return context;
  }

  /**
   * Resolve callback references in a component's generation rules.
   * Replaces {{prev.componentType.fieldName}} with actual values.
   */
  resolveCallbacks(
    template: string,
    callbackRefs: string[],
    context: Record<string, any>,
  ): string {
    let resolved = template;

    // Replace {{prev.componentType.fieldName}} references
    const refPattern = /\{\{prev\.([^.}]+)\.([^}]+)\}\}/g;
    resolved = resolved.replace(refPattern, (match, componentRef, fieldName) => {
      const componentData = context[componentRef];
      if (!componentData) {
        this.logger.warn(`Callback reference not found: ${componentRef}`);
        return match;
      }
      const value = componentData[fieldName];
      if (value === undefined) {
        this.logger.warn(`Field not found in callback: ${componentRef}.${fieldName}`);
        return match;
      }
      return String(value);
    });

    // Replace simple {{componentType.fieldName}} references
    const simpleRefPattern = /\{\{([^.}]+)\.([^}]+)\}\}/g;
    resolved = resolved.replace(simpleRefPattern, (match, componentRef, fieldName) => {
      const componentData = context[componentRef];
      if (!componentData) return match;
      const value = componentData[fieldName];
      return value !== undefined ? String(value) : match;
    });

    return resolved;
  }

  /**
   * Validate that callback references don't form cycles.
   * Returns list of errors if cycles detected.
   */
  validateCallbackReferences(
    components: Array<{
      id: string;
      callbackReferences?: string[];
      dependsOn?: string[];
    }>,
  ): string[] {
    const errors: string[] = [];
    const componentIds = new Set(components.map(c => c.id));

    // Check all references point to existing components
    for (const component of components) {
      for (const ref of component.callbackReferences || []) {
        if (!componentIds.has(ref)) {
          errors.push(`Component ${component.id} references non-existent component: ${ref}`);
        }
      }
      for (const dep of component.dependsOn || []) {
        if (!componentIds.has(dep)) {
          errors.push(`Component ${component.id} depends on non-existent component: ${dep}`);
        }
      }
    }

    // Check for cycles using DFS
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const hasCycle = (id: string): boolean => {
      if (inStack.has(id)) return true;
      if (visited.has(id)) return false;

      visited.add(id);
      inStack.add(id);

      const component = components.find(c => c.id === id);
      const deps = [...(component?.callbackReferences || []), ...(component?.dependsOn || [])];
      for (const dep of deps) {
        if (hasCycle(dep)) {
          errors.push(`Circular dependency detected involving: ${id} -> ${dep}`);
          return true;
        }
      }

      inStack.delete(id);
      return false;
    };

    for (const component of components) {
      hasCycle(component.id);
    }

    return errors;
  }
}
