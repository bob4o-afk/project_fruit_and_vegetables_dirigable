import { query } from "sdk/db";
import { producer } from "sdk/messaging";
import { extensions } from "sdk/extensions";
import { dao as daoApi } from "sdk/db";

export interface ItemStatusEntity {
    readonly Id: number;
    Name?: string;
}

export interface ItemStatusCreateEntity {
    readonly Name?: string;
}

export interface ItemStatusUpdateEntity extends ItemStatusCreateEntity {
    readonly Id: number;
}

export interface ItemStatusEntityOptions {
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
    $select?: (keyof ItemStatusEntity)[],
    $sort?: string | (keyof ItemStatusEntity)[],
    $order?: 'asc' | 'desc',
    $offset?: number,
    $limit?: number,
}

interface ItemStatusEntityEvent {
    readonly operation: 'create' | 'update' | 'delete';
    readonly table: string;
    readonly entity: Partial<ItemStatusEntity>;
    readonly key: {
        name: string;
        column: string;
        value: number;
    }
}

interface ItemStatusUpdateEntityEvent extends ItemStatusEntityEvent {
    readonly previousEntity: ItemStatusEntity;
}

export class ItemStatusRepository {

    private static readonly DEFINITION = {
        table: "CODBEX_ITEMSTATUS",
        properties: [
            {
                name: "Id",
                column: "ITEMSTATUS_ID",
                type: "INTEGER",
                id: true,
                autoIncrement: true,
            },
            {
                name: "Name",
                column: "ITEMSTATUS_NAME",
                type: "VARCHAR",
            }
        ]
    };

    private readonly dao;

    constructor(dataSource = "DefaultDB") {
        this.dao = daoApi.create(ItemStatusRepository.DEFINITION, null, dataSource);
    }

    public findAll(options?: ItemStatusEntityOptions): ItemStatusEntity[] {
        return this.dao.list(options);
    }

    public findById(id: number): ItemStatusEntity | undefined {
        const entity = this.dao.find(id);
        return entity ?? undefined;
    }

    public create(entity: ItemStatusCreateEntity): number {
        const id = this.dao.insert(entity);
        this.triggerEvent({
            operation: "create",
            table: "CODBEX_ITEMSTATUS",
            entity: entity,
            key: {
                name: "Id",
                column: "ITEMSTATUS_ID",
                value: id
            }
        });
        return id;
    }

    public update(entity: ItemStatusUpdateEntity): void {
        const previousEntity = this.findById(entity.Id);
        this.dao.update(entity);
        this.triggerEvent({
            operation: "update",
            table: "CODBEX_ITEMSTATUS",
            entity: entity,
            previousEntity: previousEntity,
            key: {
                name: "Id",
                column: "ITEMSTATUS_ID",
                value: entity.Id
            }
        });
    }

    public upsert(entity: ItemStatusCreateEntity | ItemStatusUpdateEntity): number {
        const id = (entity as ItemStatusUpdateEntity).Id;
        if (!id) {
            return this.create(entity);
        }

        const existingEntity = this.findById(id);
        if (existingEntity) {
            this.update(entity as ItemStatusUpdateEntity);
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
            table: "CODBEX_ITEMSTATUS",
            entity: entity,
            key: {
                name: "Id",
                column: "ITEMSTATUS_ID",
                value: id
            }
        });
    }

    public count(options?: ItemStatusEntityOptions): number {
        return this.dao.count(options);
    }

    public customDataCount(): number {
        const resultSet = query.execute('SELECT COUNT(*) AS COUNT FROM "CODBEX_ITEMSTATUS"');
        if (resultSet !== null && resultSet[0] !== null) {
            if (resultSet[0].COUNT !== undefined && resultSet[0].COUNT !== null) {
                return resultSet[0].COUNT;
            } else if (resultSet[0].count !== undefined && resultSet[0].count !== null) {
                return resultSet[0].count;
            }
        }
        return 0;
    }

    private async triggerEvent(data: ItemStatusEntityEvent | ItemStatusUpdateEntityEvent) {
        const triggerExtensions = await extensions.loadExtensionModules("project_fruit_and_vegetables_dirigable-Settings-ItemStatus", ["trigger"]);
        triggerExtensions.forEach(triggerExtension => {
            try {
                triggerExtension.trigger(data);
            } catch (error) {
                console.error(error);
            }            
        });
        producer.topic("project_fruit_and_vegetables_dirigable-Settings-ItemStatus").send(JSON.stringify(data));
    }
}
