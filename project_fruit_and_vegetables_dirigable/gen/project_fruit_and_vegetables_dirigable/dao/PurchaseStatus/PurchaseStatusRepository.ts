import { query } from "sdk/db";
import { producer } from "sdk/messaging";
import { extensions } from "sdk/extensions";
import { dao as daoApi } from "sdk/db";

export interface PurchaseStatusEntity {
    readonly Id: number;
    Name?: string;
}

export interface PurchaseStatusCreateEntity {
    readonly Name?: string;
}

export interface PurchaseStatusUpdateEntity extends PurchaseStatusCreateEntity {
    readonly Id: number;
}

export interface PurchaseStatusEntityOptions {
    $filter?: {
        equals?: {
            Id?: number | number[];
            Name?: string | string[];
        };
        notEquals?: {
            Id?: number | number[];
            Name?: string | string[];
        };
        contains?: {
            Id?: number;
            Name?: string;
        };
        greaterThan?: {
            Id?: number;
            Name?: string;
        };
        greaterThanOrEqual?: {
            Id?: number;
            Name?: string;
        };
        lessThan?: {
            Id?: number;
            Name?: string;
        };
        lessThanOrEqual?: {
            Id?: number;
            Name?: string;
        };
    },
    $select?: (keyof PurchaseStatusEntity)[],
    $sort?: string | (keyof PurchaseStatusEntity)[],
    $order?: 'asc' | 'desc',
    $offset?: number,
    $limit?: number,
}

interface PurchaseStatusEntityEvent {
    readonly operation: 'create' | 'update' | 'delete';
    readonly table: string;
    readonly entity: Partial<PurchaseStatusEntity>;
    readonly key: {
        name: string;
        column: string;
        value: number;
    }
}

interface PurchaseStatusUpdateEntityEvent extends PurchaseStatusEntityEvent {
    readonly previousEntity: PurchaseStatusEntity;
}

export class PurchaseStatusRepository {

    private static readonly DEFINITION = {
        table: "CODBEX_PURCHASESTATUS",
        properties: [
            {
                name: "Id",
                column: "PURCHASESTATUS_ID",
                type: "INTEGER",
                id: true,
                autoIncrement: true,
            },
            {
                name: "Name",
                column: "PURCHASESTATUS_NAME",
                type: "VARCHAR",
            }
        ]
    };

    private readonly dao;

    constructor(dataSource = "DefaultDB") {
        this.dao = daoApi.create(PurchaseStatusRepository.DEFINITION, null, dataSource);
    }

    public findAll(options?: PurchaseStatusEntityOptions): PurchaseStatusEntity[] {
        return this.dao.list(options);
    }

    public findById(id: number): PurchaseStatusEntity | undefined {
        const entity = this.dao.find(id);
        return entity ?? undefined;
    }

    public create(entity: PurchaseStatusCreateEntity): number {
        const id = this.dao.insert(entity);
        this.triggerEvent({
            operation: "create",
            table: "CODBEX_PURCHASESTATUS",
            entity: entity,
            key: {
                name: "Id",
                column: "PURCHASESTATUS_ID",
                value: id
            }
        });
        return id;
    }

    public update(entity: PurchaseStatusUpdateEntity): void {
        const previousEntity = this.findById(entity.Id);
        this.dao.update(entity);
        this.triggerEvent({
            operation: "update",
            table: "CODBEX_PURCHASESTATUS",
            entity: entity,
            previousEntity: previousEntity,
            key: {
                name: "Id",
                column: "PURCHASESTATUS_ID",
                value: entity.Id
            }
        });
    }

    public upsert(entity: PurchaseStatusCreateEntity | PurchaseStatusUpdateEntity): number {
        const id = (entity as PurchaseStatusUpdateEntity).Id;
        if (!id) {
            return this.create(entity);
        }

        const existingEntity = this.findById(id);
        if (existingEntity) {
            this.update(entity as PurchaseStatusUpdateEntity);
            return id;
        } else {
            return this.create(entity);
        }
    }

    public deleteById(id: number): void {
        const entity = this.dao.find(id);
        this.dao.remove(id);
        this.triggerEvent({
            operation: "delete",
            table: "CODBEX_PURCHASESTATUS",
            entity: entity,
            key: {
                name: "Id",
                column: "PURCHASESTATUS_ID",
                value: id
            }
        });
    }

    public count(options?: PurchaseStatusEntityOptions): number {
        return this.dao.count(options);
    }

    public customDataCount(): number {
        const resultSet = query.execute('SELECT COUNT(*) AS COUNT FROM "CODBEX_PURCHASESTATUS"');
        if (resultSet !== null && resultSet[0] !== null) {
            if (resultSet[0].COUNT !== undefined && resultSet[0].COUNT !== null) {
                return resultSet[0].COUNT;
            } else if (resultSet[0].count !== undefined && resultSet[0].count !== null) {
                return resultSet[0].count;
            }
        }
        return 0;
    }

    private async triggerEvent(data: PurchaseStatusEntityEvent | PurchaseStatusUpdateEntityEvent) {
        const triggerExtensions = await extensions.loadExtensionModules("project_fruit_and_vegetables_dirigable-PurchaseStatus-PurchaseStatus", ["trigger"]);
        triggerExtensions.forEach(triggerExtension => {
            try {
                triggerExtension.trigger(data);
            } catch (error) {
                console.error(error);
            }            
        });
        producer.topic("project_fruit_and_vegetables_dirigable-PurchaseStatus-PurchaseStatus").send(JSON.stringify(data));
    }
}
