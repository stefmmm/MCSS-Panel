import { mdiCheck, mdiClose, mdiMinus } from "@mdi/js";
import { Guid } from 'guid-ts';


export const jobOptions = [
    { value: 0, name: 'Server Action' },
    { value: 1, name: 'Run Commands' },
    { value: 2, name: 'Start Backup' }
];

export const triggerOptions = [
    { value: 0, name: 'Interval' },
    { value: 1, name: 'Time' },
    { value: 2, name: 'NoTrigger' }
];

// not the same as ServerAction, this starts from 0
export enum SchedulerServerAction {
    Stop = 0,
    Start = 1,
    Kill = 2,
    Restart = 3
}

export interface ISchedulerDetails {
    tasks: number;
    triggers: ITriggerDetails;
}

export interface ITriggerDetails {
    interval: number;
    fixedTime: number;
    noTrigger: number;
}

export interface ISchedulerTask {
    taskId: string;
    name: string;
    enabled: boolean;
    playerRequirement: number;
    trigger: TaskTrigger;
    jobs: JobTask[];
}

export interface INewSchedulerTask {
    name: string;
    enabled: boolean;
    playerRequirement: number;
    trigger: TaskTrigger;
    jobs: JobTask[];
}

export interface IEditSchedulerTask extends INewSchedulerTask { }

/* Job */
export interface JobTask {
    jobId: Guid;
    enabled: boolean;
    order: number;
}

export class CommandJobTask implements JobTask {
    jobId: Guid;
    enabled: boolean;
    order: number;
    commands: string[];

    constructor(id: Guid, enabled: boolean, order: number, commands: string[]) {
        this.jobId = id;
        this.enabled = enabled;
        this.order = order;
        this.commands = commands;
    }
}

export class BackupJobTask implements JobTask {
    jobId: Guid;
    enabled: boolean;
    order: number;
    backupIdentifier: string;

    constructor(id: Guid, enabled: boolean, order: number, backupIdentifier: string) {
        this.jobId = id;
        this.enabled = enabled;
        this.order = order;
        this.backupIdentifier = backupIdentifier;
    }
}

export class ServerActionJobTask implements JobTask {
    jobId: Guid;
    enabled: boolean;
    order: number;
    action: number;

    constructor(id: Guid, enabled: boolean, order: number, action: number) {
        this.jobId = id;
        this.enabled = enabled;
        this.order = order;
        this.action = action;
    }
}

export class DelayJobTask implements JobTask {
    jobId: Guid;
    enabled: boolean;
    order: number;
    delay: number;

    constructor(id: Guid, enabled: boolean, order: number, delay: number) {
        this.jobId = id;
        this.enabled = enabled;
        this.order = order;
        this.delay = delay;
    }
}

export class EmptyJobTask implements JobTask {
    jobId: Guid;
    enabled: boolean;
    order: number;

    constructor() {
        this.jobId = Guid.empty();
        this.enabled = false;
        this.order = undefined!;
    }
    // constructor(id: string, enabled: boolean, order: number) {
    //     this.id = id;
    //     this.enabled = enabled;
    //     this.order = order;
    // }
}

export enum Job {
    empty = "Empty Job",
    backup = "Backup",
    commands = "Command",
    serverAction = "Server Action",
    delay = "Delay",
}

export function getTaskJob(job: JobTask): Job {
    if (job == undefined) {
        return Job.empty;
    }

    if (job instanceof BackupJobTask) {
        return Job.backup;
    } else if (job instanceof CommandJobTask) {
        return Job.commands;
    } else if (job instanceof ServerActionJobTask) {
        return Job.serverAction;
    } else if (job instanceof DelayJobTask) {
        return Job.delay;
    }

    return Job.empty;
}

/* Trigger */
export interface TaskTrigger { }

export class FixedTimeTaskTrigger implements TaskTrigger {
    repeat: boolean;
    time: string;

    constructor(repeat: boolean, time: string) {
        this.repeat = repeat;
        this.time = time;
    }
}

export class IntervalTaskTrigger implements TaskTrigger {
    repeat: boolean;
    interval: number;

    constructor(repeat: boolean, interval: number) {
        this.repeat = repeat;
        this.interval = interval;
    }
}

export class TriggerlessTaskTrigger implements TaskTrigger { }

export enum Trigger {
    noTrigger = "NoTrigger",
    fixedTime = "Fixed Time",
    interval = "Interval",
}

export function getTaskTrigger(trigger: TaskTrigger): Trigger {
    if (trigger == undefined) {
        return Trigger.noTrigger;
    }

    if (trigger instanceof FixedTimeTaskTrigger) {
        return Trigger.fixedTime;
    } else if (trigger instanceof IntervalTaskTrigger) {
        return Trigger.interval;
    }

    //TODO support player triggers
    return Trigger.noTrigger;
}


/* API */
export interface ICreateSchedulerTaskRequest {
    name: string;
    enabled: boolean;
    playerRequirement: number
    trigger: object
    jobs: object[]
}

export interface IUpdateSchedulerTaskRequest extends ICreateSchedulerTaskRequest { }

export function translateRawSchedulerResponse(data: any): ISchedulerTask {
    let task: ISchedulerTask = {
        taskId: data.taskId,
        enabled: data.enabled,
        name: data.name,
        playerRequirement: data.playerRequirement,
        trigger: new TriggerlessTaskTrigger(),
        jobs: new Array()
    }

    if ('interval' in data.trigger) {
        task.trigger = new IntervalTaskTrigger(data.trigger.repeat, data.trigger.interval);
    } else if ('time' in data.trigger) {
        task.trigger = new FixedTimeTaskTrigger(data.trigger.repeat, data.trigger.time);
    } else {
        task.trigger = new TriggerlessTaskTrigger();
    }

    for (let job of data.jobs) {
        if ('commands' in job) {
            task.jobs.push(new CommandJobTask(job.guid, job.enabled, job.order, job.commands as string[]));
        } else if ('backupIdentifier' in job) {
            task.jobs.push(new BackupJobTask(job.guid, job.enabled, job.order, job.backupIdentifier as string));
        } else if ('action' in job) {
            task.jobs.push(new ServerActionJobTask(job.guid, job.enabled, job.order, job.action as number));
        } else if ('delay' in job) {
            task.jobs.push(new DelayJobTask(job.guid, job.enabled, job.order, job.delay as number));
        } else {
            task.jobs.push(new EmptyJobTask());
        }
    }

    return task;
}

/* Helper Methods */
export function getTaskEnabledIcon(task: ISchedulerTask): string {
    if (task == undefined) {
        return mdiClose;
    }

    if (task.trigger instanceof TriggerlessTaskTrigger) {
        return mdiMinus;
    }

    return task.enabled ? mdiCheck : mdiClose;
}

export function getTaskEnabledIconColor(task: ISchedulerTask): string {
    if (task == undefined) {
        return '';
    }

    if (task.trigger instanceof TriggerlessTaskTrigger) {
        return '';
    }

    return task.enabled ? 'text-green-400' : 'text-red-400';
}