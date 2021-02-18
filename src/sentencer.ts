export default class Sentencer {
  constructor(
    private readonly actions: Record<string, (...args: any[]) => string>
  ) {}

  make(template: string) {
    const self = this;

    let sentence = template;
    let occurrences = template.match(/\{\{(.+?)\}\}/g);

    if (occurrences && occurrences.length) {
      for (let i = 0; i < occurrences.length; i++) {
        let action = occurrences[i].replace("{{", "").replace("}}", "").trim();
        let result = "";
        let actionIsFunctionCall = action.match(/^\w+\((.+?)\)$/);

        if (actionIsFunctionCall) {
          let actionNameWithParens = action.match(/^(\w+)\(/);
          if (actionNameWithParens) {
            let actionName = actionNameWithParens[1];
            let actionExists = self.actions[actionName];
            let actionContents = action.match(/\((.+?)\)/);
            const actContent = actionContents && actionContents[1];

            if (actionExists && actContent) {
              try {
                let args = actContent.split(",").map(maybeCastToNumber);
                result = self.actions[actionName].apply(null, args);
              } catch (e) {}
            }
          }
        } else {
          if (self.actions[action]) {
            result = self.actions[action]();
          } else {
            result = "{{ " + action + " }}";
          }
        }
        sentence = sentence.replace(occurrences[i], result);
      }
    }
    return sentence;
  }
}

function maybeCastToNumber(input: string) {
  let trimmedInput = input.trim();
  return !Number.isNaN(Number(trimmedInput))
    ? Number(trimmedInput)
    : trimmedInput;
}
