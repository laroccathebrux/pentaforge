declare module 'markdown-it-task-checkbox' {
  import { PluginSimple } from 'markdown-it';
  
  interface TaskCheckboxOptions {
    disabled?: boolean;
    divWrap?: boolean;
    divClass?: string;
    idPrefix?: string;
  }

  const taskCheckbox: PluginSimple & {
    (options?: TaskCheckboxOptions): PluginSimple;
  };

  export = taskCheckbox;
}