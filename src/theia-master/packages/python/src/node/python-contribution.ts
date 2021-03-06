/********************************************************************************
 * Copyright (C) 2017 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable, inject, named } from 'inversify';
import { ContributionProvider } from '@theia/core';
import { PythonExtensionContribution } from './python-extension-model';
import { BaseLanguageServerContribution, IConnection } from '@theia/languages/lib/node';
import { PYTHON_LANGUAGE_ID, PYTHON_LANGUAGE_NAME } from '../common';
import { parseArgs } from '@theia/process/lib/node/utils';
import { SpawnOptions } from 'child_process';

@injectable()
export class PythonContribution extends BaseLanguageServerContribution {

    readonly id = PYTHON_LANGUAGE_ID;
    readonly name = PYTHON_LANGUAGE_NAME;

    protected readonly ready: Promise<void>;
    private pythonBundles: string[] = [];

    constructor(
        @inject(ContributionProvider) @named(PythonExtensionContribution)
        protected readonly contributions: ContributionProvider<PythonExtensionContribution>
    ) {
        super();
        this.ready = this.collectExtensionBundles();
    }

    async start(clientConnection: IConnection): Promise<void> {
        await this.ready;

        let command = 'python';
        let args = ['-m', 'pyls'];
        const pythonLsCommand = process.env.PYTHON_LS_COMMAND;
        if (pythonLsCommand) {
            command = pythonLsCommand;
            args = parseArgs(process.env.PYTHON_LS_ARGS || '');
        }
        const serverConnection = await this.createProcessStreamConnectionAsync(command, args, this.getSpawnOptions());
        this.forward(clientConnection, serverConnection);
    }

    protected getSpawnOptions(): SpawnOptions | undefined {
        return undefined;
    }

    protected onDidFailSpawnProcess(error: Error): void {
        super.onDidFailSpawnProcess(error);
        console.error('Python language server cannot be started.');
        console.error("Make sure `pyls` is installed: e.g. `pip install 'python-language-server[all]'`");
    }

    protected async collectExtensionBundles(): Promise<void> {
        for (const contrib of this.contributions.getContributions()) {
            try {
                const pythonBundles = await contrib.getExtensionBundles();
                this.pythonBundles = this.pythonBundles.concat(pythonBundles);
            } catch (e) {
                console.error(e);
            }
        }
    }

}
