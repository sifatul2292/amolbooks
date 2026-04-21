import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { Contact } from '../../../interfaces/common/contact.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddContactDto, FilterAndPaginationContactDto, OptionContactDto, UpdateContactDto } from '../../../dto/contact.dto';
import { User } from '../../../interfaces/user/user.interface';
export declare class ContactService {
    private readonly contactModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(contactModel: Model<Contact>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addContact(addContactDto: AddContactDto): Promise<ResponsePayload>;
    insertManyContact(addContactsDto: AddContactDto[], optionContactDto: OptionContactDto): Promise<ResponsePayload>;
    getAllContactsBasic(): Promise<ResponsePayload>;
    getAllContacts(filterContactDto: FilterAndPaginationContactDto, searchQuery?: string): Promise<ResponsePayload>;
    getContactById(id: string, select: string): Promise<ResponsePayload>;
    updateContactById(id: string, updateContactDto: UpdateContactDto): Promise<ResponsePayload>;
    updateMultipleContactById(ids: string[], updateContactDto: UpdateContactDto): Promise<ResponsePayload>;
    deleteContactById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleContactById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
