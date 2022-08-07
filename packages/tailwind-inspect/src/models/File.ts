import { File as FileAST, JSXElement } from "@babel/types";
import { makeObservable, observable } from "mobx";

export class File {
  constructor(ast: FileAST) {
    this.ast = ast;
    makeObservable(this);
  }

  @observable.ref ast: FileAST;

  getJSXRoots(): JSXElement[] {
    const statements = this.ast.program.body;

    const jsxRoots: JSXElement[] = [];

    for (const statement of statements) {
      if (statement.type === "ExportDefaultDeclaration") {
        const declaration = statement.declaration;
        if (declaration.type === "FunctionDeclaration") {
          const body = declaration.body;
          if (body.type === "BlockStatement") {
            const bodyStatements = body.body;
            for (const bodyStatement of bodyStatements) {
              if (bodyStatement.type === "ReturnStatement") {
                const returnStatement = bodyStatement;
                const returnValue = returnStatement.argument;
                if (returnValue?.type === "JSXElement") {
                  jsxRoots.push(returnValue);
                }
              }
            }
          }
        }
      }
    }

    return jsxRoots;
  }
}
