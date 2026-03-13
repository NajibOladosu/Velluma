export interface SignContractDto {
    contractId: string;
    userId: string;
    signatureBase64: string;
    tenantId: string;
    role: 'creator' | 'client' | 'freelancer';
}

export interface GenerateContractDto {
    tenantId: string;
    userId: string;
    prompt: string;
    clientId?: string;
    templateId?: string;
}

export interface RegenerateContractDto {
    contractId: string;
    tenantId: string;
    userId: string;
    prompt: string;
}

export interface ChangeRequestDto {
    contractId: string;
    tenantId: string;
    requesterId: string;
    details: string;
    proposedChanges?: string;
}
